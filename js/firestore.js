// === FIRESTORE OPERATIONS ===

// --- Users ---
function fsGetUsers() {
  return fbDb.collection('users').get().then(function(snap) {
    var users = [];
    snap.forEach(function(doc) {
      var d = doc.data();
      d.uid = doc.id;
      users.push(d);
    });
    return users;
  });
}

function fsCreateUser(email, name, password, role, accountIds) {
  // Create user in Firebase Auth using temp app to preserve admin session
  var tempApp = firebase.initializeApp(firebaseConfig, 'tempApp');
  var tempAuth = tempApp.auth();
  return tempAuth.createUserWithEmailAndPassword(email, password)
    .then(function(cred) {
      var uid = cred.user.uid;
      return tempAuth.signOut().then(function() {
        return tempApp.delete();
      }).then(function() {
        return fbDb.collection('users').doc(uid).set({
          email: email,
          name: name,
          role: role || 'user',
          accounts: accountIds || [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }).then(function() {
        var updates = (accountIds || []).map(function(accId) {
          return fbDb.collection('accounts').doc(accId).update({
            users: firebase.firestore.FieldValue.arrayUnion(uid)
          });
        });
        return Promise.all(updates);
      }).then(function() {
        return uid;
      });
    })
    .catch(function(err) {
      try { tempApp.delete(); } catch(e) {}
      throw err;
    });
}

function fsUpdateUser(uid, data) {
  return fbDb.collection('users').doc(uid).update(data);
}

function fsDeleteUser(uid) {
  return fbDb.collection('users').doc(uid).get().then(function(doc) {
    if (doc.exists) {
      var userData = doc.data();
      var updates = (userData.accounts || []).filter(function(id) { return id && id.trim(); }).map(function(accId) {
        return fbDb.collection('accounts').doc(accId).update({
          users: firebase.firestore.FieldValue.arrayRemove(uid)
        });
      });
      return Promise.all(updates);
    }
  }).then(function() {
    return fbDb.collection('users').doc(uid).delete();
  });
}

function fsResetPassword(email) {
  return fbAuth.sendPasswordResetEmail(email);
}

// --- Accounts ---
function fsGetAccounts() {
  return fbDb.collection('accounts').get().then(function(snap) {
    var accounts = [];
    snap.forEach(function(doc) {
      var d = doc.data();
      d.id = doc.id;
      accounts.push(d);
    });
    return accounts;
  });
}

function fsCreateAccount(name, responsible, responsibleEmail) {
  return fbDb.collection('accounts').add({
    name: name,
    responsible: responsible || '',
    responsibleEmail: responsibleEmail || '',
    users: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function fsUpdateAccount(accountId, data) {
  return fbDb.collection('accounts').doc(accountId).update(data);
}

function fsDeleteAccount(accountId) {
  return fbDb.collection('users').where('accounts', 'array-contains', accountId).get()
    .then(function(snap) {
      var updates = [];
      snap.forEach(function(doc) {
        updates.push(fbDb.collection('users').doc(doc.id).update({
          accounts: firebase.firestore.FieldValue.arrayRemove(accountId)
        }));
      });
      return Promise.all(updates);
    })
    .then(function() {
      return fsDeleteSubcollection('accounts/' + accountId + '/salesData');
    })
    .then(function() {
      return fsDeleteSubcollection('accounts/' + accountId + '/crmData');
    })
    .then(function() {
      return fbDb.collection('accounts').doc(accountId).delete();
    });
}

function fsDeleteSubcollection(path) {
  return fbDb.collection(path).get().then(function(snap) {
    var batch = fbDb.batch();
    snap.forEach(function(doc) { batch.delete(doc.ref); });
    return batch.commit();
  });
}

function fsAssignUserToAccount(uid, accountId) {
  return Promise.all([
    fbDb.collection('users').doc(uid).update({
      accounts: firebase.firestore.FieldValue.arrayUnion(accountId)
    }),
    fbDb.collection('accounts').doc(accountId).update({
      users: firebase.firestore.FieldValue.arrayUnion(uid)
    })
  ]);
}

function fsRemoveUserFromAccount(uid, accountId) {
  return Promise.all([
    fbDb.collection('users').doc(uid).update({
      accounts: firebase.firestore.FieldValue.arrayRemove(accountId)
    }),
    fbDb.collection('accounts').doc(accountId).update({
      users: firebase.firestore.FieldValue.arrayRemove(uid)
    })
  ]);
}

// --- Sales Data ---
function fsGetSalesData(accountId) {
  return fbDb.collection('accounts').doc(accountId).collection('salesData').get()
    .then(function(snap) {
      var allRecords = [];
      snap.forEach(function(doc) {
        var data = doc.data();
        if (data.records && Array.isArray(data.records)) {
          allRecords = allRecords.concat(data.records);
        }
      });
      return allRecords;
    });
}

function fsUploadSalesData(accountId, records) {
  // Group records by year-month and write each as a separate document
  var groups = {};
  records.forEach(function(r) {
    var key = (r.year || 'unknown') + '_' + (r.month || 'unknown');
    if (!groups[key]) groups[key] = { year: r.year, month: r.month, records: [] };
    groups[key].records.push(r);
  });

  // For each group, merge with existing data (append mode)
  var writes = Object.keys(groups).map(function(key) {
    var group = groups[key];
    var docRef = fbDb.collection('accounts').doc(accountId).collection('salesData').doc(key);
    return docRef.get().then(function(doc) {
      var existing = doc.exists ? (doc.data().records || []) : [];
      var merged = existing.concat(group.records);
      return docRef.set({
        year: group.year,
        month: group.month,
        records: merged,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  });

  return Promise.all(writes).then(function() {
    return records.length;
  });
}

function fsReplaceSalesData(accountId, records) {
  // Replace mode: clear existing data for the year-months being uploaded, then write
  var groups = {};
  records.forEach(function(r) {
    var key = (r.year || 'unknown') + '_' + (r.month || 'unknown');
    if (!groups[key]) groups[key] = { year: r.year, month: r.month, records: [] };
    groups[key].records.push(r);
  });

  var writes = Object.keys(groups).map(function(key) {
    var group = groups[key];
    return fbDb.collection('accounts').doc(accountId).collection('salesData').doc(key).set({
      year: group.year,
      month: group.month,
      records: group.records,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  });

  return Promise.all(writes).then(function() {
    return records.length;
  });
}

function fsClearSalesData(accountId, year) {
  return fbDb.collection('accounts').doc(accountId).collection('salesData').get()
    .then(function(snap) {
      var batch = fbDb.batch();
      snap.forEach(function(doc) {
        var data = doc.data();
        if (!year || data.year === year) {
          batch.delete(doc.ref);
        }
      });
      return batch.commit();
    });
}

function fsGetSalesDataStatus(accountId) {
  return fbDb.collection('accounts').doc(accountId).collection('salesData').get()
    .then(function(snap) {
      var status = {};
      snap.forEach(function(doc) {
        var data = doc.data();
        var year = data.year || 'unknown';
        if (!status[year]) status[year] = 0;
        status[year] += (data.records || []).length;
      });
      return status;
    });
}

function fsExportAccountData(accountId, accountName) {
  return fsGetSalesData(accountId).then(function(records) {
    var blob = new Blob([JSON.stringify(records)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sml_data_' + (accountName || accountId) + '.json';
    a.click();
  });
}

// --- CRM Data ---
function fsUploadCrmData(accountId, records, uploaderUid) {
  var crmRef = fbDb.collection('accounts').doc(accountId).collection('crmData');
  // Clean up old auto-ID documents from previous uploads
  return crmRef.get().then(function(snap) {
    var batch = fbDb.batch();
    snap.forEach(function(doc) {
      if (doc.id !== 'latest') batch.delete(doc.ref);
    });
    return batch.commit();
  }).then(function() {
    // Use fixed doc ID 'latest' so each upload replaces the previous one
    return crmRef.doc('latest').set({
      uploadedBy: uploaderUid,
      uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
      recordCount: records.length,
      records: records
    });
  });
}

function fsGetLatestCrmData(accountId) {
  return fbDb.collection('accounts').doc(accountId).collection('crmData').doc('latest').get()
    .then(function(doc) {
      if (doc.exists && doc.data().records) return doc.data().records;
      return [];
    });
}

function fsGetAllCrmData(accountId) {
  return fbDb.collection('accounts').doc(accountId).collection('crmData')
    .orderBy('uploadedAt', 'desc').get()
    .then(function(snap) {
      var records = [];
      snap.forEach(function(doc) {
        var data = doc.data();
        if (data.records) records = records.concat(data.records);
      });
      return records;
    });
}

// --- Vendor Database ---
function fsUploadVendorDb(accountId, vendors) {
  return fbDb.collection('accounts').doc(accountId).collection('crmData').doc('vendorDb').set({
    vendors: vendors,
    recordCount: vendors.length,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function fsGetVendorDb(accountId) {
  return fbDb.collection('accounts').doc(accountId).collection('crmData').doc('vendorDb').get()
    .then(function(doc) {
      if (doc.exists && doc.data().vendors) return doc.data().vendors;
      return [];
    });
}

// --- Migration ---
function fsMigrateHistoricalData(accountId) {
  return fetch('historical-data.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.length) throw new Error('No data in historical-data.json');
      return fsReplaceSalesData(accountId, data).then(function() {
        return data.length;
      });
    });
}
