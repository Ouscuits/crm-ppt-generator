// === SHARED UTILITIES ===

function showStatus(id, msg, type, autoHide) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  var base = el.dataset.statusClass || 'msg';
  el.className = base + ' show ' + (type || '');
  el.style.display = '';
  if (autoHide) {
    setTimeout(function() { el.className = base; }, typeof autoHide === 'number' ? autoHide : 5000);
  }
}

function showMsg(txt, type) { showStatus('msg', txt, type); }

function escHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function uniqueVals(rows,key){var s={};rows.forEach(function(r){if(r[key])s[r[key]]=1;});return Object.keys(s).sort();}
function groupRowsBy(rows,key){var g={};rows.forEach(function(r){var k=r[key]||'Unknown';if(!g[k])g[k]=[];g[k].push(r);});return g;}
function statusCounts(rows){var c={A:0,P:0,H:0,N:0};rows.forEach(function(r){var s=(r.status||'').toLowerCase();if(s==='active')c.A++;else if(s==='potential')c.P++;else if(s==='hold')c.H++;else if(s==='no go'||s==='nogo')c.N++;});return c;}
function totalVol(rows){var t=0;rows.forEach(function(r){t+=r.volume;});return t;}
function fmtVol(v){if(v>=1e6)return (v/1e6).toFixed(1)+'M';if(v>=1e3)return (v/1e3).toFixed(1)+'K';return v.toLocaleString();}
function normStatus(s){var sl=(s||'').toLowerCase();if(sl==='active')return 'Active';if(sl==='potential')return 'Potential';if(sl==='hold')return 'Hold';if(sl==='no go'||sl==='nogo')return 'No Go';return s||'—';}
function statusColor(s){var sl=(s||'').toLowerCase();if(sl==='active')return '2E7D32';if(sl==='potential')return '1565C0';if(sl==='hold')return 'E8A317';if(sl==='no go'||sl==='nogo')return 'E21B1B';return '777777';}
function statusBgColor(s){var sl=(s||'').toLowerCase();if(sl==='active')return 'E8F5E9';if(sl==='potential')return 'E3F2FD';if(sl==='hold')return 'FFF8E1';if(sl==='no go'||sl==='nogo')return 'FFEBEE';return 'F4F4F4';}
function getPeriodLabel(rows){var ms={};rows.forEach(function(r){if(r.month)ms[r.month]=r.monthName;});var keys=Object.keys(ms).sort(function(a,b){return +a-+b;});if(!keys.length)return '';if(keys.length<=4)return keys.map(function(k){return ms[k].substring(0,3);}).join(', ');return ms[keys[0]].substring(0,3)+' – '+ms[keys[keys.length-1]].substring(0,3);}
function fmtDate(val){if(!val)return '—';if(val instanceof Date&&!isNaN(val))return val.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});var d=new Date(val.toString());return isNaN(d)?val.toString():d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}

function toggleDrop(id){document.getElementById(id).classList.toggle('open');}
document.addEventListener('click',function(e){if(!e.target.closest('.mdrop'))document.querySelectorAll('.mdrop-list.open').forEach(function(d){d.classList.remove('open');});});
