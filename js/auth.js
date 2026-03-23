// === AUTH, NAVIGATION & ADMIN PANEL ===

var currentUser = null;
var currentUserData = null;
var currentAccount = null;
var currentAccountData = null;

// --- View Management ---
function showView(viewId) {
  ['loginView', 'accountSelector', 'mainApp', 'adminView'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = (id === viewId) ? '' : 'none';
  });
}

// --- Login ---
function handleLogin() {
  var email = document.getElementById('loginEmail').value.trim();
  var pwd = document.getElementById('loginPassword').value;
  var errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  if (!email || !pwd) {
    errEl.textContent = 'Please enter email and password.';
    errEl.style.display = 'block';
    return;
  }
  document.getElementById('loginBtn').disabled = true;
  document.getElementById('loginBtn').textContent = 'Signing in...';
  fbAuth.signInWithEmailAndPassword(email, pwd)
    .catch(function(err) {
      errEl.textContent = err.message.replace('Firebase: ', '');
      errEl.style.display = 'block';
      document.getElementById('loginBtn').disabled = false;
      document.getElementById('loginBtn').textContent = 'Sign In';
    });
}

function handleLoginKeydown(e) {
  if (e.key === 'Enter') handleLogin();
}

// --- Logout ---
function handleLogout() {
  fbAuth.signOut().then(function() {
    currentUser = null;
    currentUserData = null;
    currentAccount = null;
    currentAccountData = null;
    dashData = [];
    dashFiltered = [];
  });
}

// --- Account Selection ---
function selectAccount(accountId) {
  fbDb.collection('accounts').doc(accountId).get().then(function(doc) {
    if (doc.exists) {
      currentAccount = accountId;
      currentAccountData = doc.data();
      currentAccountData.id = accountId;
      // Reset global state
      allRows=[];filteredRows=[];paData=[];paFiltered=[];
      dashData=[];dashFiltered=[];dashSelectedCompanies=[];dashSelectedMonths=[];
      currentDashTab='overview';
      // Update main app bar
      document.getElementById('accountNameDisplay').textContent = currentAccountData.name;
      document.getElementById('appUserDisplay').textContent = currentUserData.name || currentUser.email;
      // Show/hide admin button
      var adminBtn = document.getElementById('appAdminBtn');
      if (adminBtn) adminBtn.style.display = currentUserData.role === 'admin' ? '' : 'none';
      showView('mainApp');
      goHome();
    }
  });
}

function backToAccounts() {
  currentAccount = null;
  currentAccountData = null;
  // Reset all global state
  allRows=[];filteredRows=[];paData=[];paFiltered=[];
  dashData=[];dashFiltered=[];dashSelectedCompanies=[];dashSelectedMonths=[];
  currentDashTab='overview';
  Object.keys(dashCharts).forEach(function(k) {
    if (dashCharts[k]) dashCharts[k].destroy();
  });
  dashCharts = {};
  showAccountSelector();
}

function loadUserAccounts() {
  var container = document.getElementById('accountCards');
  container.innerHTML = '<p style="text-align:center;color:var(--mid);font-family:\'Space Mono\',monospace;font-size:12px">Loading accounts...</p>';

  // Update user info
  document.getElementById('acctUserName').textContent = currentUserData.name || currentUser.email;
  document.getElementById('acctUserRole').textContent = currentUserData.role === 'admin' ? 'Administrator' : 'User';
  // Show/hide admin button
  var adminBtn = document.getElementById('acctAdminBtn');
  if (adminBtn) adminBtn.style.display = currentUserData.role === 'admin' ? '' : 'none';

  var accountIds = (currentUserData.accounts || []).filter(function(id) { return id && id.trim(); });
  if (accountIds.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--mid);padding:40px 0">No accounts assigned. Contact admin.</p>';
    return;
  }

  var promises = accountIds.map(function(id) {
    return fbDb.collection('accounts').doc(id).get();
  });

  Promise.all(promises).then(function(docs) {
    container.innerHTML = '';
    docs.forEach(function(doc) {
      if (doc.exists) {
        var data = doc.data();
        var card = document.createElement('div');
        card.className = 'account-card';
        card.onclick = function() { selectAccount(doc.id); };
        card.innerHTML =
          '<h3>' + escHtml(data.name) + '</h3>' +
          '<p class="account-responsible">' + escHtml(data.responsible || '') + '</p>' +
          '<p class="account-email">' + escHtml(data.responsibleEmail || '') + '</p>';
        container.appendChild(card);
      }
    });
    if (container.children.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--mid);padding:40px 0">No accounts found.</p>';
    }
  });
}

function showAccountSelector() {
  showView('accountSelector');
  loadUserAccounts();
}

// --- Auth State Listener ---
fbAuth.onAuthStateChanged(function(user) {
  if (user) {
    fbDb.collection('users').doc(user.uid).get().then(function(userDoc) {
      if (userDoc.exists) {
        currentUser = user;
        currentUserData = userDoc.data();
        currentUserData.uid = user.uid;
        showAccountSelector();
      } else {
        fbAuth.signOut();
        showLoginError('Account not authorized. Contact admin.');
      }
    }).catch(function(err) {
      fbAuth.signOut();
      showLoginError('Error: ' + err.message);
    });
  } else {
    currentUser = null;
    currentUserData = null;
    showView('loginView');
    var emailEl = document.getElementById('loginEmail');
    var pwdEl = document.getElementById('loginPassword');
    if (emailEl) emailEl.value = '';
    if (pwdEl) pwdEl.value = '';
    var btn = document.getElementById('loginBtn');
    if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
  }
});

function showLoginError(msg) {
  var errEl = document.getElementById('loginError');
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }
}

// escHtml, showStatus now in utils.js

// ========================================
// ADMIN PANEL
// ========================================

var adminTab = 'users';
var adminAllUsers = [];
var adminAllAccounts = [];
var adminEditingUser = null;
var adminEditingAccount = null;

function showAdminPanel() {
  showView('adminView');
  setAdminTab('users');
}

function setAdminTab(tab) {
  adminTab = tab;
  document.querySelectorAll('.admin-tab-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.getElementById('adminUsersTab').style.display = tab === 'users' ? '' : 'none';
  document.getElementById('adminAccountsTab').style.display = tab === 'accounts' ? '' : 'none';
  document.getElementById('adminDataTab').style.display = tab === 'data' ? '' : 'none';
  if (tab === 'users') loadAdminUsers();
  else if (tab === 'accounts') loadAdminAccounts();
  else if (tab === 'data') initAdminDataTab();
}

// --- USERS TAB ---
function loadAdminUsers() {
  Promise.all([fsGetUsers(), fsGetAccounts()]).then(function(results) {
    adminAllUsers = results[0];
    adminAllAccounts = results[1];
    renderUsersTable();
  });
}

function renderUsersTable() {
  var acctMap = {};
  adminAllAccounts.forEach(function(a) { acctMap[a.id] = a.name; });

  var html = '<table class="admin-table"><thead><tr>' +
    '<th>Name</th><th>Email</th><th>Role</th><th>Accounts</th><th>Actions</th>' +
    '</tr></thead><tbody>';
  adminAllUsers.forEach(function(u) {
    var acctNames = (u.accounts || []).map(function(id) { return acctMap[id] || id; }).join(', ') || 'None';
    html += '<tr>' +
      '<td>' + escHtml(u.name || '') + '</td>' +
      '<td style="font-family:\'Space Mono\',monospace;font-size:11px">' + escHtml(u.email || '') + '</td>' +
      '<td><span class="role-badge role-' + u.role + '">' + u.role + '</span></td>' +
      '<td style="font-size:11px">' + escHtml(acctNames) + '</td>' +
      '<td>' +
        '<button class="btn-sm" onclick="editUserForm(\'' + u.uid + '\')">Edit</button> ' +
        '<button class="btn-sm" onclick="resetUserPwd(\'' + escHtml(u.email) + '\')">Reset Pwd</button> ' +
        '<button class="btn-sm" style="color:var(--red)" onclick="confirmDeleteUser(\'' + u.uid + '\',\'' + escHtml(u.name || u.email) + '\')">Delete</button>' +
      '</td></tr>';
  });
  html += '</tbody></table>';
  document.getElementById('usersTableContainer').innerHTML = html;
}

function toggleUserForm(show) {
  var form = document.getElementById('userFormContainer');
  if (show === undefined) show = form.style.display === 'none';
  form.style.display = show ? '' : 'none';
  if (show && !adminEditingUser) {
    document.getElementById('userFormTitle').textContent = 'Add New User';
    document.getElementById('userName').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userPasswordField').style.display = '';
    document.getElementById('userRole').value = 'user';
    // Reset account checkboxes
    renderUserAccountCheckboxes([]);
    document.getElementById('userFormBtn').textContent = 'Create User';
    document.getElementById('userFormBtn').onclick = createUserSubmit;
  }
}

function renderUserAccountCheckboxes(selectedIds) {
  var container = document.getElementById('userAccountChecks');
  container.innerHTML = '';
  adminAllAccounts.forEach(function(a) {
    var checked = selectedIds.indexOf(a.id) > -1 ? ' checked' : '';
    container.innerHTML += '<label style="display:flex;align-items:center;gap:6px;margin:4px 0;font-size:12px;cursor:pointer">' +
      '<input type="checkbox" value="' + a.id + '"' + checked + ' style="accent-color:var(--red)">' +
      escHtml(a.name) + '</label>';
  });
}

function getSelectedUserAccounts() {
  var checks = document.querySelectorAll('#userAccountChecks input:checked');
  var ids = [];
  checks.forEach(function(cb) { ids.push(cb.value); });
  return ids;
}

function createUserSubmit() {
  var name = document.getElementById('userName').value.trim();
  var email = document.getElementById('userEmail').value.trim();
  var password = document.getElementById('userPassword').value;
  var role = document.getElementById('userRole').value;
  var accounts = getSelectedUserAccounts();

  if (!name || !email || !password) {
    showStatus('adminUserMsg','All fields required.', 'err');
    return;
  }
  if (password.length < 6) {
    showStatus('adminUserMsg','Password must be at least 6 characters.', 'err');
    return;
  }

  document.getElementById('userFormBtn').disabled = true;
  document.getElementById('userFormBtn').textContent = 'Creating...';

  fsCreateUser(email, name, password, role, accounts)
    .then(function() {
      showStatus('adminUserMsg','User created successfully.', 'ok');
      toggleUserForm(false);
      adminEditingUser = null;
      loadAdminUsers();
    })
    .catch(function(err) {
      showStatus('adminUserMsg','Error: ' + err.message, 'err');
    })
    .finally(function() {
      document.getElementById('userFormBtn').disabled = false;
      document.getElementById('userFormBtn').textContent = 'Create User';
    });
}

function editUserForm(uid) {
  var user = adminAllUsers.find(function(u) { return u.uid === uid; });
  if (!user) return;
  adminEditingUser = uid;
  toggleUserForm(true);
  document.getElementById('userFormTitle').textContent = 'Edit User';
  document.getElementById('userName').value = user.name || '';
  document.getElementById('userEmail').value = user.email || '';
  document.getElementById('userEmail').disabled = true;
  document.getElementById('userPasswordField').style.display = 'none';
  document.getElementById('userRole').value = user.role || 'user';
  renderUserAccountCheckboxes(user.accounts || []);
  document.getElementById('userFormBtn').textContent = 'Save Changes';
  document.getElementById('userFormBtn').onclick = updateUserSubmit;
}

function updateUserSubmit() {
  if (!adminEditingUser) return;
  var name = document.getElementById('userName').value.trim();
  var role = document.getElementById('userRole').value;
  var newAccounts = getSelectedUserAccounts();

  if (!name) {
    showStatus('adminUserMsg','Name is required.', 'err');
    return;
  }

  document.getElementById('userFormBtn').disabled = true;
  document.getElementById('userFormBtn').textContent = 'Saving...';

  // Get current user data to compute account changes
  var oldUser = adminAllUsers.find(function(u) { return u.uid === adminEditingUser; });
  var oldAccounts = (oldUser ? (oldUser.accounts || []) : []).filter(function(id) { return id && id.trim(); });

  // Accounts to add and remove
  var toAdd = newAccounts.filter(function(id) { return oldAccounts.indexOf(id) === -1; });
  var toRemove = oldAccounts.filter(function(id) { return newAccounts.indexOf(id) === -1; });

  var promises = [];
  // Update user doc
  promises.push(fsUpdateUser(adminEditingUser, { name: name, role: role, accounts: newAccounts }));
  // Update account docs
  toAdd.forEach(function(accId) {
    promises.push(fbDb.collection('accounts').doc(accId).update({
      users: firebase.firestore.FieldValue.arrayUnion(adminEditingUser)
    }));
  });
  toRemove.forEach(function(accId) {
    promises.push(fbDb.collection('accounts').doc(accId).update({
      users: firebase.firestore.FieldValue.arrayRemove(adminEditingUser)
    }));
  });

  Promise.all(promises)
    .then(function() {
      showStatus('adminUserMsg','User updated.', 'ok');
      adminEditingUser = null;
      document.getElementById('userEmail').disabled = false;
      toggleUserForm(false);
      loadAdminUsers();
    })
    .catch(function(err) {
      showStatus('adminUserMsg','Error: ' + err.message, 'err');
    })
    .finally(function() {
      document.getElementById('userFormBtn').disabled = false;
      document.getElementById('userFormBtn').textContent = 'Save Changes';
    });
}

function cancelUserForm() {
  adminEditingUser = null;
  document.getElementById('userEmail').disabled = false;
  toggleUserForm(false);
}

function confirmDeleteUser(uid, name) {
  if (uid === currentUser.uid) {
    showStatus('adminUserMsg','Cannot delete your own account.', 'err');
    return;
  }
  if (confirm('Delete user "' + name + '"? This cannot be undone.')) {
    fsDeleteUser(uid).then(function() {
      showStatus('adminUserMsg','User deleted.', 'ok');
      loadAdminUsers();
    }).catch(function(err) {
      showStatus('adminUserMsg','Error: ' + err.message, 'err');
    });
  }
}

function resetUserPwd(email) {
  if (confirm('Send password reset email to ' + email + '?')) {
    fsResetPassword(email).then(function() {
      showStatus('adminUserMsg','Password reset email sent to ' + email, 'ok');
    }).catch(function(err) {
      showStatus('adminUserMsg','Error: ' + err.message, 'err');
    });
  }
}

// showAdminUserMsg removed — uses showStatus from utils.js

// --- ACCOUNTS TAB ---
function loadAdminAccounts() {
  Promise.all([fsGetAccounts(), fsGetUsers()]).then(function(results) {
    adminAllAccounts = results[0];
    adminAllUsers = results[1];
    renderAccountsTable();
  });
}

function renderAccountsTable() {
  var userMap = {};
  adminAllUsers.forEach(function(u) { userMap[u.uid] = u.name || u.email; });

  var html = '<table class="admin-table"><thead><tr>' +
    '<th>Name</th><th>Responsible</th><th>Email</th><th>Users</th><th>Actions</th>' +
    '</tr></thead><tbody>';
  adminAllAccounts.forEach(function(a) {
    var userNames = (a.users || []).map(function(uid) { return userMap[uid] || uid; }).join(', ') || 'None';
    html += '<tr>' +
      '<td><strong>' + escHtml(a.name) + '</strong></td>' +
      '<td>' + escHtml(a.responsible || '') + '</td>' +
      '<td style="font-family:\'Space Mono\',monospace;font-size:11px">' + escHtml(a.responsibleEmail || '') + '</td>' +
      '<td style="font-size:11px">' + escHtml(userNames) + '</td>' +
      '<td>' +
        '<button class="btn-sm" onclick="editAccountForm(\'' + a.id + '\')">Edit</button> ' +
        '<button class="btn-sm" style="color:var(--red)" onclick="confirmDeleteAccount(\'' + a.id + '\',\'' + escHtml(a.name) + '\')">Delete</button>' +
      '</td></tr>';
  });
  html += '</tbody></table>';
  document.getElementById('accountsTableContainer').innerHTML = html;
}

function toggleAccountForm(show) {
  var form = document.getElementById('accountFormContainer');
  if (show === undefined) show = form.style.display === 'none';
  form.style.display = show ? '' : 'none';
  if (show && !adminEditingAccount) {
    document.getElementById('accountFormTitle').textContent = 'Add New Account';
    document.getElementById('accountName').value = '';
    document.getElementById('accountResponsible').value = '';
    document.getElementById('accountEmail').value = '';
    document.getElementById('accountFormBtn').textContent = 'Create Account';
    document.getElementById('accountFormBtn').onclick = createAccountSubmit;
  }
}

function createAccountSubmit() {
  var name = document.getElementById('accountName').value.trim();
  var responsible = document.getElementById('accountResponsible').value.trim();
  var email = document.getElementById('accountEmail').value.trim();

  if (!name) {
    showStatus('adminAcctMsg','Account name is required.', 'err');
    return;
  }

  document.getElementById('accountFormBtn').disabled = true;
  document.getElementById('accountFormBtn').textContent = 'Creating...';

  fsCreateAccount(name, responsible, email)
    .then(function() {
      showStatus('adminAcctMsg','Account created.', 'ok');
      toggleAccountForm(false);
      adminEditingAccount = null;
      loadAdminAccounts();
    })
    .catch(function(err) {
      showStatus('adminAcctMsg','Error: ' + err.message, 'err');
    })
    .finally(function() {
      document.getElementById('accountFormBtn').disabled = false;
      document.getElementById('accountFormBtn').textContent = 'Create Account';
    });
}

function editAccountForm(accountId) {
  var acct = adminAllAccounts.find(function(a) { return a.id === accountId; });
  if (!acct) return;
  adminEditingAccount = accountId;
  toggleAccountForm(true);
  document.getElementById('accountFormTitle').textContent = 'Edit Account';
  document.getElementById('accountName').value = acct.name || '';
  document.getElementById('accountResponsible').value = acct.responsible || '';
  document.getElementById('accountEmail').value = acct.responsibleEmail || '';
  document.getElementById('accountFormBtn').textContent = 'Save Changes';
  document.getElementById('accountFormBtn').onclick = updateAccountSubmit;
}

function updateAccountSubmit() {
  if (!adminEditingAccount) return;
  var name = document.getElementById('accountName').value.trim();
  var responsible = document.getElementById('accountResponsible').value.trim();
  var email = document.getElementById('accountEmail').value.trim();

  if (!name) {
    showStatus('adminAcctMsg','Account name is required.', 'err');
    return;
  }

  document.getElementById('accountFormBtn').disabled = true;
  fsUpdateAccount(adminEditingAccount, { name: name, responsible: responsible, responsibleEmail: email })
    .then(function() {
      showStatus('adminAcctMsg','Account updated.', 'ok');
      adminEditingAccount = null;
      toggleAccountForm(false);
      loadAdminAccounts();
    })
    .catch(function(err) {
      showStatus('adminAcctMsg','Error: ' + err.message, 'err');
    })
    .finally(function() {
      document.getElementById('accountFormBtn').disabled = false;
    });
}

function cancelAccountForm() {
  adminEditingAccount = null;
  toggleAccountForm(false);
}

function confirmDeleteAccount(accountId, name) {
  if (confirm('Delete account "' + name + '" and ALL its data? This cannot be undone.')) {
    fsDeleteAccount(accountId).then(function() {
      showStatus('adminAcctMsg','Account deleted.', 'ok');
      loadAdminAccounts();
    }).catch(function(err) {
      showStatus('adminAcctMsg','Error: ' + err.message, 'err');
    });
  }
}

// showAdminAcctMsg removed — uses showStatus from utils.js

// --- DATA TAB ---
function initAdminDataTab() {
  // Populate account selector
  fsGetAccounts().then(function(accounts) {
    adminAllAccounts = accounts;
    var sel = document.getElementById('adminDataAccount');
    sel.innerHTML = '<option value="">-- Select Account --</option>';
    accounts.forEach(function(a) {
      sel.innerHTML += '<option value="' + a.id + '">' + escHtml(a.name) + '</option>';
    });
  });
}

function onAdminDataAccountChange() {
  var accountId = document.getElementById('adminDataAccount').value;
  if (accountId) {
    loadAdminDataStatus();
  } else {
    document.getElementById('adminDataStatus').innerHTML = '';
  }
}

function loadAdminDataStatus() {
  var accountId = document.getElementById('adminDataAccount').value;
  if (!accountId) return;

  document.getElementById('adminDataStatus').innerHTML = '<p style="font-size:12px;color:var(--mid)">Loading...</p>';

  fsGetSalesDataStatus(accountId).then(function(status) {
    var years = Object.keys(status).sort();
    if (years.length === 0) {
      document.getElementById('adminDataStatus').innerHTML =
        '<p style="font-size:12px;color:var(--mid)">No data uploaded yet.</p>';
      return;
    }
    var html = '<div style="font-size:12px;margin-bottom:8px">';
    var total = 0;
    years.forEach(function(y) {
      total += status[y];
      html += '<span class="year-tag hist">' + escHtml(y) + ': ' + status[y].toLocaleString() + ' records</span> ';
    });
    html += '</div>';
    html += '<p style="font-size:11px;color:var(--mid)">Total: ' + total.toLocaleString() + ' records</p>';
    document.getElementById('adminDataStatus').innerHTML = html;
  });
}

function handleAdminDataUpload(files) {
  var accountId = document.getElementById('adminDataAccount').value;
  if (!accountId) {
    showStatus('adminDataMsg','Select an account first.', 'err');
    return;
  }
  if (!files || !files.length) return;
  if (!xlsxReady) {
    showStatus('adminDataMsg','XLSX library not ready yet.', 'err');
    return;
  }

  var allParsed = [];
  var processed = 0;
  var total = files.length;
  showStatus('adminDataMsg','Processing ' + total + ' file(s)...', 'ok');

  for (var f = 0; f < files.length; f++) {
    (function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
          var ws = wb.Sheets[wb.SheetNames[0]];
          var raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
          var parsed = parseExcelRows(raw);
          allParsed = allParsed.concat(parsed);
        } catch(ex) {
          showStatus('adminDataMsg','Error in ' + file.name + ': ' + ex.message, 'err');
        }
        processed++;
        if (processed === total) {
          showStatus('adminDataMsg','Uploading ' + allParsed.length + ' records to Firestore...', 'ok');
          fsUploadSalesData(accountId, allParsed)
            .then(function() {
              showStatus('adminDataMsg','Uploaded ' + allParsed.length + ' records from ' + total + ' file(s).', 'ok');
              loadAdminDataStatus();
              // Refresh dashboard if this is the current account
              if (currentAccount === accountId && currentMode === 'dash') {
                loadDashboardData();
              }
            })
            .catch(function(err) {
              showStatus('adminDataMsg','Upload error: ' + err.message, 'err');
            });
        }
      };
      reader.readAsBinaryString(file);
    })(files[f]);
  }
}

function clearAccountYear() {
  var accountId = document.getElementById('adminDataAccount').value;
  if (!accountId) {
    showStatus('adminDataMsg','Select an account first.', 'err');
    return;
  }
  var year = prompt('Enter year to clear (e.g., 2026), or leave empty to clear ALL data:');
  if (year === null) return; // cancelled
  var msg = year ? 'Clear all data for year ' + year + '?' : 'Clear ALL data for this account?';
  if (!confirm(msg)) return;

  fsClearSalesData(accountId, year || null)
    .then(function() {
      showStatus('adminDataMsg',year ? 'Year ' + year + ' data cleared.' : 'All data cleared.', 'ok');
      loadAdminDataStatus();
    })
    .catch(function(err) {
      showStatus('adminDataMsg','Error: ' + err.message, 'err');
    });
}

function exportAccountData() {
  var accountId = document.getElementById('adminDataAccount').value;
  if (!accountId) {
    showStatus('adminDataMsg','Select an account first.', 'err');
    return;
  }
  var acct = adminAllAccounts.find(function(a) { return a.id === accountId; });
  fsExportAccountData(accountId, acct ? acct.name : accountId);
}

function migrateHistorical() {
  var accountId = document.getElementById('adminDataAccount').value;
  if (!accountId) {
    showStatus('adminDataMsg','Select an account first.', 'err');
    return;
  }
  if (!confirm('This will upload historical-data.json to the selected account.\nExisting data for the same months will be REPLACED.\nContinue?')) return;

  showStatus('adminDataMsg','Loading and uploading historical data...', 'ok');
  fsMigrateHistoricalData(accountId)
    .then(function(count) {
      showStatus('adminDataMsg','Migrated ' + count.toLocaleString() + ' historical records.', 'ok');
      loadAdminDataStatus();
    })
    .catch(function(err) {
      showStatus('adminDataMsg','Error: ' + err.message, 'err');
    });
}

// showAdminDataMsg removed — uses showStatus from utils.js
