// === PENDING ACTIONS ===
var paData=[],paFiltered=[];

function loadPendingActions(){
  document.getElementById('modeSelect').style.display='none';
  var loading=document.getElementById('actionsLoading');
  var content=document.getElementById('actionsContent');
  var empty=document.getElementById('actionsEmpty');
  loading.style.display='';content.style.display='none';empty.style.display='none';

  // Try Firestore first, fallback to in-memory allRows
  if(currentAccount){
    fsGetAllCrmData(currentAccount).then(function(records){
      if(records.length>0){
        processPendingActions(records);
      } else if(allRows.length>0){
        processPendingActions(allRows);
      } else {
        loading.style.display='none';empty.style.display='';
      }
    }).catch(function(){
      if(allRows.length>0) processPendingActions(allRows);
      else {loading.style.display='none';empty.style.display='';}
    });
  } else if(allRows.length>0){
    processPendingActions(allRows);
  } else {
    loading.style.display='none';empty.style.display='';
  }
}

function processPendingActions(records){
  var loading=document.getElementById('actionsLoading');
  var content=document.getElementById('actionsContent');
  var empty=document.getElementById('actionsEmpty');
  var today=new Date();today.setHours(0,0,0,0);

  // Normalize records - ensure date objects
  var normalized=records.map(function(r){
    var rec=Object.assign({},r);
    // Ensure actionDate is a Date
    if(rec.actionDate && !(rec.actionDate instanceof Date)){
      if(rec.actionDate.toDate) rec.actionDate=rec.actionDate.toDate(); // Firestore Timestamp
      else {var d=new Date(rec.actionDate);rec.actionDate=isNaN(d)?null:d;}
    }
    if(rec.date && !(rec.date instanceof Date)){
      if(rec.date.toDate) rec.date=rec.date.toDate();
      else {var d2=new Date(rec.date);rec.date=isNaN(d2)?null:d2;}
    }
    return rec;
  });

  // Build lookup: latest visit date per vendor+site
  var latestVisit={};
  normalized.forEach(function(r){
    if(!r.vendor||!r.site||!r.date)return;
    var key=r.vendor.toLowerCase()+'|'+r.site.toLowerCase();
    if(!latestVisit[key]||r.date>latestVisit[key]) latestVisit[key]=r.date;
  });

  // Filter records that have actionDate set
  paData=[];
  normalized.forEach(function(r){
    if(!r.actionDate)return;
    var ad=new Date(r.actionDate);ad.setHours(0,0,0,0);
    var diff=Math.ceil((ad-today)/(1000*60*60*24));
    var urgency='upcoming';
    if(diff<0) urgency='overdue';
    else if(diff<=7) urgency='due-soon';

    // Check if there's been a follow-up visit after the record's own date
    var hasFollowup=false;
    if(r.vendor&&r.site&&r.date){
      var key=r.vendor.toLowerCase()+'|'+r.site.toLowerCase();
      var latest=latestVisit[key];
      if(latest&&latest>r.date) hasFollowup=true;
    }

    paData.push({
      vendor:r.vendor||'—',
      site:r.site||'—',
      brand:r.brand||'—',
      salesperson:r.salesperson||'—',
      nextAction:r.nextAction,
      actionDate:r.actionDate,
      visitDate:r.date,
      daysLeft:diff,
      urgency:urgency,
      hasFollowup:hasFollowup,
      status:r.status||'',
      priority:r.priority||''
    });
  });

  // Sort: overdue first, then by date ascending
  paData.sort(function(a,b){
    var ua={'overdue':0,'due-soon':1,'upcoming':2};
    if(ua[a.urgency]!==ua[b.urgency]) return ua[a.urgency]-ua[b.urgency];
    return a.actionDate-b.actionDate;
  });

  if(paData.length===0){
    loading.style.display='none';empty.style.display='';return;
  }

  // Build filter options
  buildPaFilters();
  loading.style.display='none';content.style.display='';
  renderPendingActions();
}

function buildPaFilters(){
  var salespersons={},countries={},statuses={};
  paData.forEach(function(r){
    if(r.salesperson&&r.salesperson!=='—') salespersons[r.salesperson]=1;
    if(r.site&&r.site!=='—') countries[r.site]=1;
    if(r.status&&r.status!=='—'&&r.status.trim()) statuses[normStatus(r.status)]=1;
  });
  var spSel=document.getElementById('paFilterSalesperson');
  spSel.innerHTML='<option value="all">All Salespersons</option>';
  Object.keys(salespersons).sort().forEach(function(s){
    var o=document.createElement('option');o.value=s;o.textContent=s;spSel.appendChild(o);
  });
  var cSel=document.getElementById('paFilterCountry');
  cSel.innerHTML='<option value="all">All Countries</option>';
  Object.keys(countries).sort().forEach(function(c){
    var o=document.createElement('option');o.value=c;o.textContent=c;cSel.appendChild(o);
  });
  var stSel=document.getElementById('paFilterStatus');
  stSel.innerHTML='<option value="all">All Visit Status</option>';
  Object.keys(statuses).sort().forEach(function(s){
    var o=document.createElement('option');o.value=s;o.textContent=s;stSel.appendChild(o);
  });
}

function renderPendingActions(){
  var sp=document.getElementById('paFilterSalesperson').value;
  var ct=document.getElementById('paFilterCountry').value;
  var st=document.getElementById('paFilterStatus').value;
  var ur=document.getElementById('paFilterUrgency').value;

  paFiltered=paData.filter(function(r){
    if(sp!=='all'&&r.salesperson!==sp)return false;
    if(ct!=='all'&&r.site!==ct)return false;
    if(st!=='all'&&normStatus(r.status)!==st)return false;
    if(ur!=='all'&&r.urgency!==ur)return false;
    return true;
  });

  // Stats
  var overdue=0,dueSoon=0,upcoming=0,noFollowup=0;
  paFiltered.forEach(function(r){
    if(r.urgency==='overdue')overdue++;
    else if(r.urgency==='due-soon')dueSoon++;
    else upcoming++;
    if(!r.hasFollowup)noFollowup++;
  });

  document.getElementById('paStats').innerHTML=
    '<div class="pa-stat overdue"><div class="pa-stat-val">'+overdue+'</div><div class="pa-stat-lbl">Overdue</div></div>'+
    '<div class="pa-stat due-soon"><div class="pa-stat-val">'+dueSoon+'</div><div class="pa-stat-lbl">Due Soon (7d)</div></div>'+
    '<div class="pa-stat upcoming"><div class="pa-stat-val">'+upcoming+'</div><div class="pa-stat-lbl">Upcoming</div></div>'+
    '<div class="pa-stat total"><div class="pa-stat-val">'+noFollowup+'</div><div class="pa-stat-lbl">No Follow-up</div></div>';

  // Detect if salesperson filter is active → use compact grouped layout
  var isFiltered=sp!=='all';

  var html='';
  if(paFiltered.length===0){
    html='<div style="text-align:center;padding:30px;color:var(--mid);background:#fff;border-radius:12px;border:1px solid var(--light)">No actions match the selected filters</div>';
  } else if(isFiltered){
    // --- COMPACT GROUPED LAYOUT ---
    // Context header with filtered person info
    var sampleRow=paFiltered[0];
    html+='<div class="pa-context-bar">';
    html+='<span class="pa-ctx-item"><span class="pa-ctx-lbl">Salesperson</span> '+escHtml(sampleRow.salesperson)+'</span>';
    if(ct!=='all') html+='<span class="pa-ctx-item"><span class="pa-ctx-lbl">Country</span> '+escHtml(ct)+'</span>';
    if(st!=='all') html+='<span class="pa-ctx-item"><span class="pa-ctx-lbl">Status</span> '+escHtml(st)+'</span>';
    html+='</div>';

    // Group by brand
    var brandGroups={};
    paFiltered.forEach(function(r){
      var b=r.brand||'Other';
      if(!brandGroups[b])brandGroups[b]=[];
      brandGroups[b].push(r);
    });
    var brands=Object.keys(brandGroups).sort();

    brands.forEach(function(brand){
      var rows=brandGroups[brand];
      html+='<div class="pa-brand-group">';
      html+='<div class="pa-brand-header">'+escHtml(brand)+'<span class="pa-brand-count">'+rows.length+'</span></div>';
      html+='<table class="pa-table pa-table-compact"><thead><tr>'+
        '<th>Urgency</th><th>Deadline</th><th>Days</th><th>Vendor</th>'+
        '<th>Next Action</th><th>Follow-up</th>'+
        '</tr></thead><tbody>';
      rows.forEach(function(r){
        var rowClass=r.urgency==='overdue'?'pa-overdue':r.urgency==='due-soon'?'pa-due-soon':'';
        var urgLabel=r.urgency==='overdue'?'OVERDUE':r.urgency==='due-soon'?'DUE SOON':'UPCOMING';
        var daysText=r.daysLeft<0?Math.abs(r.daysLeft)+'d ago':r.daysLeft===0?'Today':r.daysLeft+'d';
        var followupHtml=r.hasFollowup?
          '<span style="color:#2E7D32;font-weight:700;font-size:11px">Yes</span>':
          '<span class="pa-no-followup">NO VISIT</span>';
        html+='<tr class="'+rowClass+'">'+
          '<td><span class="pa-urgency '+r.urgency+'">'+urgLabel+'</span></td>'+
          '<td style="font-family:\'Space Mono\',monospace;font-size:11px;white-space:nowrap">'+fmtDate(r.actionDate)+'</td>'+
          '<td style="font-family:\'Space Mono\',monospace;font-size:12px;font-weight:700;text-align:center">'+daysText+'</td>'+
          '<td>'+escHtml(r.vendor)+'</td>'+
          '<td>'+escHtml(r.nextAction||'—')+'</td>'+
          '<td style="text-align:center">'+followupHtml+'</td>'+
          '</tr>';
      });
      html+='</tbody></table></div>';
    });
  } else {
    // --- FULL TABLE (no salesperson filter) ---
    html+='<table class="pa-table"><thead><tr>'+
      '<th>Urgency</th><th>Deadline</th><th>Days</th><th>Status</th><th>Vendor</th><th>Country</th><th>Brand</th>'+
      '<th>Salesperson</th><th>Next Action</th><th>Follow-up</th>'+
      '</tr></thead><tbody>';
    paFiltered.forEach(function(r){
      var rowClass=r.urgency==='overdue'?'pa-overdue':r.urgency==='due-soon'?'pa-due-soon':'';
      var urgLabel=r.urgency==='overdue'?'OVERDUE':r.urgency==='due-soon'?'DUE SOON':'UPCOMING';
      var daysText=r.daysLeft<0?Math.abs(r.daysLeft)+'d ago':r.daysLeft===0?'Today':r.daysLeft+'d';
      var ns=normStatus(r.status);
      var sc=ns.toLowerCase();
      var sCls=sc==='active'?'s-a':sc==='potential'?'s-p':sc==='hold'?'s-h':(sc==='no go'?'s-n':'');
      var followupHtml=r.hasFollowup?
        '<span style="color:#2E7D32;font-weight:700;font-size:11px">Yes</span>':
        '<span class="pa-no-followup">NO VISIT</span>';
      html+='<tr class="'+rowClass+'">'+
        '<td><span class="pa-urgency '+r.urgency+'">'+urgLabel+'</span></td>'+
        '<td style="font-family:\'Space Mono\',monospace;font-size:11px;white-space:nowrap">'+fmtDate(r.actionDate)+'</td>'+
        '<td style="font-family:\'Space Mono\',monospace;font-size:12px;font-weight:700;text-align:center">'+daysText+'</td>'+
        '<td>'+(sCls?'<span class="s-badge '+sCls+'">'+escHtml(ns)+'</span>':escHtml(ns||'—'))+'</td>'+
        '<td>'+escHtml(r.vendor)+'</td>'+
        '<td>'+escHtml(r.site)+'</td>'+
        '<td>'+escHtml(r.brand)+'</td>'+
        '<td>'+escHtml(r.salesperson)+'</td>'+
        '<td style="max-width:250px">'+escHtml(r.nextAction||'—')+'</td>'+
        '<td style="text-align:center">'+followupHtml+'</td>'+
        '</tr>';
    });
    html+='</tbody></table>';
  }
  document.getElementById('paTableWrap').innerHTML=html;
}

function clearPaFilter(){
  document.getElementById('paFilterSalesperson').value='all';
  document.getElementById('paFilterCountry').value='all';
  document.getElementById('paFilterStatus').value='all';
  document.getElementById('paFilterUrgency').value='all';
  renderPendingActions();
}

function sendPendingEmail(){
  var actions=paFiltered.length>0?paFiltered:paData;
  if(actions.length===0){alert('No pending actions to report.');return;}
  var overdue=actions.filter(function(r){return r.urgency==='overdue';});
  var dueSoon=actions.filter(function(r){return r.urgency==='due-soon';});
  var upcoming=actions.filter(function(r){return r.urgency==='upcoming';});
  var noFollowup=actions.filter(function(r){return !r.hasFollowup;});
  var accountName=currentAccountData?currentAccountData.name:'CRM';
  var today=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  var subject='Pending CRM Actions - '+accountName+' ('+today+')';

  // Build HTML email body
  var h='';
  // KPI summary line — plain text, no background colors
  h+='<p style="font-size:13px;color:#000000;margin:0 0 16px 0">';
  h+='<b>Overdue: '+overdue.length+'</b> &nbsp; | &nbsp; ';
  h+='<b>Due Soon: '+dueSoon.length+'</b> &nbsp; | &nbsp; ';
  h+='<b>Upcoming: '+upcoming.length+'</b> &nbsp; | &nbsp; ';
  h+='<b>No Follow-up: '+noFollowup.length+'</b>';
  h+='</p>';

  // Build table for each section
  if(overdue.length) h+=emailSection('Overdue Actions','#E21B1B',overdue);
  if(dueSoon.length) h+=emailSection('Due Soon (next 7 days)','#E8A317',dueSoon);
  if(upcoming.length<=20) h+=emailSection('Upcoming','#2E7D32',upcoming);
  else h+='<p style="color:#777;font-size:13px;margin:12px 0">+ '+upcoming.length+' upcoming actions (see CRM tool for full list)</p>';

  showEmailModal(subject,h,accountName,today,actions.length);
}


function emailSection(title,color,rows){
  var cols=5;
  var h='<table cellpadding="0" cellspacing="0" border="1" bordercolor="#cccccc" width="100%" style="margin-bottom:16px;border-collapse:collapse;font-size:12px;font-family:Arial,Helvetica,sans-serif">';
  h+='<tr><td colspan="'+cols+'" style="padding:8px 12px;font-size:13px;font-weight:700;color:'+color+';border-bottom:2px solid '+color+'">'+title+' ('+rows.length+')</td></tr>';
  // Column headers — once
  var thS='padding:6px 8px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#000000;border-bottom:2px solid #000000';
  h+='<tr><th style="'+thS+'">Deadline</th><th style="'+thS+'">Days</th><th style="'+thS+'">Vendor</th><th style="'+thS+'">Action</th><th style="'+thS+';text-align:center">Follow-up</th></tr>';
  // Group by brand
  var bg={};rows.forEach(function(r){var b=r.brand||'Other';if(!bg[b])bg[b]=[];bg[b].push(r);});
  var tdS='padding:5px 8px;border-bottom:1px solid #cccccc;color:#000000;';
  Object.keys(bg).sort().forEach(function(brand){
    var bRows=bg[brand],ct={},st={},sp={};
    bRows.forEach(function(r){if(r.site&&r.site!=='—')ct[r.site]=1;var ns=normStatus(r.status);if(ns&&ns!=='—')st[ns]=1;if(r.salesperson&&r.salesperson!=='—')sp[r.salesperson]=1;});
    h+='<tr><td colspan="'+cols+'" style="padding:5px 8px;font-size:11px;color:#000000;border-bottom:1px solid #cccccc"><b>'+escHtml(brand)+'</b> &nbsp; '+escHtml(Object.keys(ct).join(', '))+' &nbsp;|&nbsp; '+escHtml(Object.keys(st).join(', '))+' &nbsp;|&nbsp; '+escHtml(Object.keys(sp).join(', '))+'</td></tr>';
    bRows.forEach(function(r){
      var d=r.daysLeft<0?Math.abs(r.daysLeft)+'d ago':r.daysLeft===0?'Today':r.daysLeft+'d';
      var fu=r.hasFollowup?'Yes':'<b>NO VISIT</b>';
      h+='<tr><td style="'+tdS+'font-family:Courier New,monospace;font-size:11px;white-space:nowrap">'+fmtDate(r.actionDate)+'</td><td style="'+tdS+'font-family:Courier New,monospace;font-weight:700">'+d+'</td><td style="'+tdS+'">'+escHtml(r.vendor)+'</td><td style="'+tdS+'">'+escHtml(r.nextAction||'—')+'</td><td style="'+tdS+'text-align:center;font-weight:700">'+fu+'</td></tr>';
    });
  });
  h+='</table>';
  return h;
}

function showEmailModal(subject,htmlBody,accountName,today,totalCount){
  // Full HTML email template — all text black, white backgrounds, borders to delimit
  var fullHtml='<table cellpadding="0" cellspacing="0" border="1" bordercolor="#cccccc" width="100%" style="max-width:800px;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#000000">';
  // Header
  fullHtml+='<tr><td style="padding:16px 24px;border-bottom:3px solid #E21B1B">';
  fullHtml+='<b style="font-size:20px;color:#E21B1B">SML GROUP</b>';
  fullHtml+='<span style="font-size:12px;color:#000000"> &mdash; CRM Pending Actions Report</span>';
  fullHtml+='</td></tr>';
  // Account + date bar
  fullHtml+='<tr><td style="padding:12px 24px;border-bottom:1px solid #cccccc">';
  fullHtml+='<b style="font-size:14px">'+escHtml(accountName)+'</b>';
  fullHtml+=' &nbsp; | &nbsp; '+escHtml(today)+' &nbsp; | &nbsp; '+totalCount+' actions';
  fullHtml+='</td></tr>';
  // KPI row
  fullHtml+='<tr><td style="padding:16px 24px;border-bottom:1px solid #cccccc">';
  fullHtml+=htmlBody;
  fullHtml+='</td></tr>';
  // Footer
  fullHtml+='<tr><td style="padding:10px 24px;font-size:10px;color:#666666">Generated by SML CRM Tool</td></tr>';
  fullHtml+='</table>';

  var overlay=document.createElement('div');
  overlay.id='emailOverlay';
  overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);z-index:2000;display:flex;align-items:center;justify-content:center';
  var panel=document.createElement('div');
  panel.style.cssText='background:#fff;border-radius:14px;padding:28px;max-width:900px;width:95%;max-height:90vh;display:flex;flex-direction:column';
  panel.innerHTML=
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">'+
      '<h3 style="font-size:18px;font-weight:700;flex:1">Send Reminder Email</h3>'+
      '<button class="pa-email-btn" onclick="doSelectAndCopy()">Select &amp; Copy</button>'+
      '<button class="pa-email-btn" style="background:#1565C0" onclick="doOpenMailto()">Open Email Client</button>'+
      '<button class="btn-sm" onclick="closeEmailModal()">Close</button>'+
    '</div>'+
    '<div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">'+
      '<div style="flex:1;min-width:200px">'+
        '<label style="font-size:11px;font-weight:600;display:block;margin-bottom:3px">To:</label>'+
        '<input type="text" id="emailTo" placeholder="recipient@example.com, ..." style="width:100%;padding:8px 12px;border:2px solid #E4E4E4;border-radius:8px;font-size:13px;font-family:DM Sans,sans-serif">'+
      '</div>'+
      '<div style="flex:2;min-width:200px">'+
        '<label style="font-size:11px;font-weight:600;display:block;margin-bottom:3px">Subject:</label>'+
        '<input type="text" id="emailSubject" value="'+escHtml(subject)+'" style="width:100%;padding:8px 12px;border:2px solid #E4E4E4;border-radius:8px;font-size:13px;font-family:DM Sans,sans-serif">'+
      '</div>'+
    '</div>'+
    '<div id="emailStatus" style="display:none;margin-bottom:10px;font-family:Space Mono,monospace;font-size:11px;padding:8px 12px;border-radius:8px"></div>'+
    '<p style="font-size:11px;color:#999;margin-bottom:6px">Preview — click "Select &amp; Copy" then paste (Ctrl+V) in your email:</p>'+
    '<div id="emailPreview" style="flex:1;overflow-y:auto;border:1px solid #E4E4E4;border-radius:10px;background:#F9F9F9;padding:16px;min-height:300px;cursor:text"></div>';
  overlay.appendChild(panel);
  overlay.addEventListener('click',function(e){if(e.target===overlay)closeEmailModal();});
  document.body.appendChild(overlay);
  document.getElementById('emailPreview').innerHTML=fullHtml;
  document.getElementById('emailTo').focus();
}

function closeEmailModal(){
  var el=document.getElementById('emailOverlay');
  if(el)el.remove();
}

function doSelectAndCopy(){
  var preview=document.getElementById('emailPreview');
  if(!preview)return;
  // Select all content of the preview div
  var range=document.createRange();
  range.selectNodeContents(preview);
  var sel=window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  // Copy — execCommand on visible rendered content preserves formatting
  var ok=false;
  try{ok=document.execCommand('copy');}catch(e){}
  if(ok){
    showEmailStatus('Copied with formatting. Paste (Ctrl+V) in your email client.','ok');
  } else {
    showEmailStatus('Content selected. Press Ctrl+C to copy.','err');
  }
}

function doOpenMailto(){
  var to=(document.getElementById('emailTo').value||'').trim();
  var subj=document.getElementById('emailSubject').value||'';
  doSelectAndCopy();
  setTimeout(function(){
    window.location.href='mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(subj);
  },500);
}

function showEmailStatus(msg,type){
  var el=document.getElementById('emailStatus');
  if(!el)return;
  el.textContent=msg;
  el.style.display='block';
  el.style.background=type==='ok'?'#E8F5E9':'#FFEBEE';
  el.style.color=type==='ok'?'#1B5E20':'#B71C1C';
  el.style.border='1px solid '+(type==='ok'?'#A5D6A7':'#FFCDD2');
}
