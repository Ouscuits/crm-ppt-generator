// === SALES DASHBOARD ===
var dashData=[],dashFiltered=[],dashCharts={};
var dashSelectedCompanies=[], dashSelectedMonths=[], currentDashTab='overview';
var DASH_COLORS=['#E21B1B','#1565C0','#2E7D32','#E8A317','#7B1FA2','#00838F','#EF6C00','#AD1457','#4E342E','#37474F','#1B5E20','#B71C1C','#0D47A1','#F57F17','#4A148C'];

function parseExcelRows(raw){
  return raw.filter(function(r){return r['[Month]'] && String(r['[Month]']).trim()!=='';}).map(function(r){
    return {
      day:Number(r['[Day]'])||0,
      qty:Number(r['[Invoice_QTY__Pcs_2]'])||0,
      month:String(r['[Month]']||'').trim(),
      monthNo:Number(r['[MonthNo]'])||0,
      salesHKD:Number(r['[Sales_Amount_in_HKD]'])||0,
      salesUSD:Number(r['[SumAmount_USD]'])||0,
      year:String(r['[Year]']||'').trim(),
      customer:String(r['Customer Info[Customer Name]']||'').trim(),
      country:String(r['DB Country name.Country name SP']||'').trim(),
      brand:String(r['DB program Name SP.Program Name SP']||'').trim(),
      subProgram:String(r['Program[Sub Program Name]']||'').trim(),
      subCode:String(r['Program[Main&Sub Program Code]']||'').trim(),
      callOut:String(r['Sales Details[Call Out]']||'').trim(),
      company:String(r['Sales Details[Company]']||'').trim(),
      productType:String(r['Sales Details[Product Type Eng Desc]']||'').trim(),
      vendor:String(r['Sales Details[Vendor Name]']||'').trim(),
      source:String(r['Sales Details[Source]']||'').trim()
    };
  });
}

function loadDashboardData(){
  if(!currentAccount) return;
  var loading=document.getElementById('dashLoading');
  loading.style.display='block';
  loading.textContent='Loading dashboard data...';
  fsGetSalesData(currentAccount).then(function(records){
    dashData=records;
    if(dashData.length===0){
      loading.style.display='block';
      loading.textContent='No data available. Admin must upload sales data for this account.';
      document.getElementById('dashContent').classList.add('dash-hidden');

      document.getElementById('modeSelect').style.display='';
      return;
    }
    loading.style.display='none';

    document.getElementById('modeSelect').style.display='none';
    initDashFilters();
    dashFiltered=dashData.slice();
    renderDashboard();
    document.getElementById('dashContent').classList.remove('dash-hidden');
  }).catch(function(err){
    loading.textContent='Error loading data: '+err.message;
  });
}

function initDashFilters(){
  var countries=uniqueDash('country');
  var brands=uniqueDash('brand');
  var companies=uniqueDash('company');
  var years=uniqueDash('year');
  var months=dashData.map(function(r){return r.month}).filter(Boolean);
  var monthOrder=['January','February','March','April','May','June','July','August','September','October','November','December'];
  months=[...new Set(months)].sort(function(a,b){return monthOrder.indexOf(a)-monthOrder.indexOf(b);});
  fillSelect('dashCountry',countries);
  fillSelect('dashBrand',brands);
  fillDashCompanies(companies);
  fillSelect('dashYear',years);
  fillDashMonths(months);
}
function uniqueDash(key){
  return [...new Set(dashData.map(function(r){return r[key]}).filter(Boolean))].sort();
}
function fillSelect(id,vals){
  var sel=document.getElementById(id);
  var first=sel.options[0].text;
  sel.innerHTML='<option value="all">'+first+'</option>';
  vals.forEach(function(v){
    var o=document.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o);
  });
}
function fillDashCompanies(companies){
  var list=document.getElementById('dashCompanyList');
  list.innerHTML='';
  companies.forEach(function(c){
    var item=document.createElement('div');item.className='mdrop-item';
    var id='dc_'+c.replace(/[^a-zA-Z0-9]/g,'_');
    item.innerHTML='<input type="checkbox" id="'+id+'" value="'+c+'" onchange="updateDashCompanies()"><label for="'+id+'">'+c+'</label>';
    list.appendChild(item);
  });
  dashSelectedCompanies=[];
  document.getElementById('dashCompanyLabel').textContent='All companies';
}
function updateDashCompanies(){
  dashSelectedCompanies=[];
  document.querySelectorAll('#dashCompanyList input:checked').forEach(function(cb){dashSelectedCompanies.push(cb.value);});
  var lbl=document.getElementById('dashCompanyLabel');
  if(dashSelectedCompanies.length===0)lbl.textContent='All companies';
  else if(dashSelectedCompanies.length<=2)lbl.textContent=dashSelectedCompanies.join(', ');
  else lbl.textContent=dashSelectedCompanies.length+' companies';
  applyDashFilter();
}
function fillDashMonths(months){
  var list=document.getElementById('dashMonthList');
  list.innerHTML='';
  months.forEach(function(m){
    var item=document.createElement('div');item.className='mdrop-item';
    item.innerHTML='<input type="checkbox" id="dm_'+m+'" value="'+m+'" onchange="updateDashMonths()"><label for="dm_'+m+'">'+m+'</label>';
    list.appendChild(item);
  });
  dashSelectedMonths=[];
  document.getElementById('dashMonthLabel').textContent='All months';
}
function updateDashMonths(){
  dashSelectedMonths=[];
  document.querySelectorAll('#dashMonthList input:checked').forEach(function(cb){dashSelectedMonths.push(cb.value);});
  var lbl=document.getElementById('dashMonthLabel');
  if(dashSelectedMonths.length===0)lbl.textContent='All months';
  else if(dashSelectedMonths.length<=2)lbl.textContent=dashSelectedMonths.map(function(m){return m.substring(0,3);}).join(', ');
  else lbl.textContent=dashSelectedMonths.length+' months';
  applyDashFilter();
}
function applyDashFilter(){
  var c=document.getElementById('dashCountry').value;
  var b=document.getElementById('dashBrand').value;
  var y=document.getElementById('dashYear').value;
  dashFiltered=dashData.filter(function(r){
    if(c!=='all'&&r.country!==c)return false;
    if(b!=='all'&&r.brand!==b)return false;
    if(dashSelectedCompanies.length>0&&dashSelectedCompanies.indexOf(r.company)===-1)return false;
    if(y!=='all'&&r.year!==y)return false;
    if(dashSelectedMonths.length>0&&dashSelectedMonths.indexOf(r.month)===-1)return false;
    return true;
  });
  renderDashboard();
}
function clearDashFilter(){
  document.getElementById('dashCountry').value='all';
  document.getElementById('dashBrand').value='all';
  dashSelectedCompanies=[];
  document.querySelectorAll('#dashCompanyList input:checked').forEach(function(cb){cb.checked=false;});
  document.getElementById('dashCompanyLabel').textContent='All companies';
  document.getElementById('dashYear').value='all';
  dashSelectedMonths=[];
  document.querySelectorAll('#dashMonthList input:checked').forEach(function(cb){cb.checked=false;});
  document.getElementById('dashMonthLabel').textContent='All months';
  dashFiltered=dashData.slice();
  renderDashboard();
}

function setDashTab(tab){
  currentDashTab=tab;
  var labels={overview:'Sales Overview',brand:'Brand Analysis',zara:'Zara Breakdown',period:'Period Comparison'};
  document.querySelectorAll('.dash-tab').forEach(function(b){b.classList.toggle('active',b.textContent===labels[tab]);});
  document.getElementById('tabOverview').style.display=tab==='overview'?'':'none';
  document.getElementById('tabBrand').style.display=tab==='brand'?'':'none';
  document.getElementById('tabZara').style.display=tab==='zara'?'':'none';
  document.getElementById('tabPeriod').style.display=tab==='period'?'':'none';
  renderCurrentTab();
}
function renderDashboard(){
  renderKpis();
  renderCurrentTab();
}
function renderCurrentTab(){
  if(currentDashTab==='overview')renderOverviewTab();
  else if(currentDashTab==='brand')renderBrandTab();
  else if(currentDashTab==='zara')renderZaraTab();
  else if(currentDashTab==='period')renderPeriodTab();
}
function renderOverviewTab(){
  renderChart('chartCountry','country','salesHKD','bar');
  renderChart('chartProduct','productType','salesHKD','doughnut');
  renderRfid('chartRfid',dashFiltered);
  renderTrend();
  renderCustomers('chartCustomers',dashFiltered);
}
function renderBrandTab(){
  renderChart('chartBrandSales','brand','salesHKD','bar');
  renderBrandProduct();
  renderBrandRfid();
  renderBrandMix();
  renderBrandCustomers();
}
// === ZARA TAB ===
var ZARA_SUBS=['Maag','Ecru','Vilet','Dub'];
function getZaraRows(){
  return dashFiltered.filter(function(r){return r.brand==='Zara';});
}
function getZaraTaggedRows(){
  return getZaraRows().map(function(r){
    var copy={};for(var k in r)copy[k]=r[k];
    copy.zaraLabel=ZARA_SUBS.indexOf(r.subProgram)>-1?r.subProgram:'ZARA';
    return copy;
  });
}
function renderZaraTab(){
  var rows=getZaraTaggedRows();
  renderZaraChart('chartZaraSubs',rows,'zaraLabel','salesHKD','bar');
  renderZaraChart('chartZaraSubsQty',rows,'zaraLabel','qty','bar');
  renderZaraSubProduct(rows);
  renderZaraSubCountry(rows);
  renderZaraTrend(rows);
  renderCustomers('chartZaraCustomers',rows);
}

function renderZaraChart(canvasId,rows,groupKey,valueKey,type){
  var agg={};
  rows.forEach(function(r){
    var k=r[groupKey]||'Unknown';
    agg[k]=(agg[k]||0)+r[valueKey];
  });
  var entries=Object.entries(agg).sort(function(a,b){return b[1]-a[1];});
  var labels=entries.map(function(e){return e[0];});
  var data=entries.map(function(e){return e[1];});
  if(dashCharts[canvasId]){dashCharts[canvasId].destroy();}
  var ctx=document.getElementById(canvasId).getContext('2d');
  dashCharts[canvasId]=new Chart(ctx,{
    type:type,
    data:{labels:labels,datasets:[{data:data,backgroundColor:DASH_COLORS.slice(0,labels.length),borderWidth:0,borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ctx.label+': '+fmtNum(ctx.raw);}}}},
      scales:{y:{beginAtZero:true,ticks:{callback:function(v){return fmtNum(v);},font:{family:'Space Mono',size:10}}},x:{ticks:{font:{family:'DM Sans',size:10}}}}
    }
  });
}

function renderZaraSubProduct(rows){
  var subs={};
  rows.forEach(function(r){
    var s=r.zaraLabel||r.subProgram||'Unknown';
    if(!subs[s])subs[s]={};
    var pt=r.productType||'Unknown';
    subs[s][pt]=(subs[s][pt]||0)+r.salesHKD;
  });
  var subNames=Object.keys(subs).sort(function(a,b){
    var ta=0,tb=0;Object.values(subs[a]).forEach(function(v){ta+=v;});Object.values(subs[b]).forEach(function(v){tb+=v;});return tb-ta;
  });
  var allPts=new Set();
  subNames.forEach(function(s){Object.keys(subs[s]).forEach(function(pt){allPts.add(pt);});});
  var ptList=[...allPts].sort();
  var datasets=ptList.map(function(pt,i){
    return {label:pt,data:subNames.map(function(s){return subs[s][pt]||0;}),backgroundColor:DASH_COLORS[i%DASH_COLORS.length],borderRadius:4,borderWidth:0};
  });
  if(dashCharts['chartZaraProduct']){dashCharts['chartZaraProduct'].destroy();}
  var ctx=document.getElementById('chartZaraProduct').getContext('2d');
  dashCharts['chartZaraProduct']=new Chart(ctx,{
    type:'bar',
    data:{labels:subNames,datasets:datasets},
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{position:'top',labels:{font:{family:'DM Sans',size:10}}},tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': '+fmtNum(ctx.raw);}}}},
      scales:{x:{stacked:true,ticks:{font:{family:'DM Sans',size:10}}},y:{stacked:true,beginAtZero:true,ticks:{callback:function(v){return fmtNum(v);},font:{family:'Space Mono',size:10}}}}
    }
  });
}

function renderZaraSubCountry(rows){
  var subs={};
  rows.forEach(function(r){
    var s=r.zaraLabel||r.subProgram||'Unknown';
    if(!subs[s])subs[s]={};
    var c=r.country||'Unknown';
    subs[s][c]=(subs[s][c]||0)+r.salesHKD;
  });
  var subNames=Object.keys(subs).sort(function(a,b){
    var ta=0,tb=0;Object.values(subs[a]).forEach(function(v){ta+=v;});Object.values(subs[b]).forEach(function(v){tb+=v;});return tb-ta;
  });
  var allCountries=new Set();
  subNames.forEach(function(s){Object.keys(subs[s]).forEach(function(c){allCountries.add(c);});});
  var countryList=[...allCountries].sort();
  var datasets=countryList.map(function(c,i){
    return {label:c,data:subNames.map(function(s){return subs[s][c]||0;}),backgroundColor:DASH_COLORS[i%DASH_COLORS.length],borderRadius:4,borderWidth:0};
  });
  if(dashCharts['chartZaraCountry']){dashCharts['chartZaraCountry'].destroy();}
  var ctx=document.getElementById('chartZaraCountry').getContext('2d');
  dashCharts['chartZaraCountry']=new Chart(ctx,{
    type:'bar',
    data:{labels:subNames,datasets:datasets},
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{position:'top',labels:{font:{family:'DM Sans',size:10}}},tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': '+fmtNum(ctx.raw);}}}},
      scales:{x:{stacked:true,ticks:{font:{family:'DM Sans',size:10}}},y:{stacked:true,beginAtZero:true,ticks:{callback:function(v){return fmtNum(v);},font:{family:'Space Mono',size:10}}}}
    }
  });
}

function renderZaraTrend(rows){
  var monthOrder=['January','February','March','April','May','June','July','August','September','October','November','December'];
  var subs={};
  rows.forEach(function(r){
    var s=r.zaraLabel||r.subProgram||'Unknown';
    if(!subs[s])subs[s]={};
    subs[s][r.month]=(subs[s][r.month]||0)+r.salesHKD;
  });
  var subNames=Object.keys(subs).sort(function(a,b){
    var ta=0,tb=0;Object.values(subs[a]).forEach(function(v){ta+=v;});Object.values(subs[b]).forEach(function(v){tb+=v;});return tb-ta;
  });
  var allMonths=new Set();
  subNames.forEach(function(s){Object.keys(subs[s]).forEach(function(m){allMonths.add(m);});});
  var months=[...allMonths].sort(function(a,b){return monthOrder.indexOf(a)-monthOrder.indexOf(b);});
  var datasets=subNames.map(function(s,i){
    return {label:s,data:months.map(function(m){return subs[s][m]||0;}),borderColor:DASH_COLORS[i%DASH_COLORS.length],backgroundColor:DASH_COLORS[i%DASH_COLORS.length]+'22',fill:false,tension:0.3,pointRadius:3,borderWidth:2};
  });
  if(dashCharts['chartZaraTrend']){dashCharts['chartZaraTrend'].destroy();}
  var ctx=document.getElementById('chartZaraTrend').getContext('2d');
  dashCharts['chartZaraTrend']=new Chart(ctx,{
    type:'line',
    data:{labels:months.map(function(m){return m.substring(0,3);}),datasets:datasets},
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{position:'top',labels:{font:{family:'DM Sans',size:10}}},tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': '+fmtNum(ctx.raw)+' HKD';}}}},
      scales:{y:{beginAtZero:true,ticks:{callback:function(v){return fmtNum(v);},font:{family:'Space Mono',size:10}}},x:{ticks:{font:{family:'DM Sans',size:11}}}}
    }
  });
}

function renderPeriodTab(){
  renderQuarterly();
  renderYoY();
  renderQByDimension('chartQCountry','country');
  renderQByDimension('chartQBrand','brand');
}

function renderKpis(){
  var totalHKD=0,totalUSD=0,totalQty=0,vendors=new Set(),customers=new Set();
  dashFiltered.forEach(function(r){
    totalHKD+=r.salesHKD;totalUSD+=r.salesUSD;totalQty+=r.qty;
    if(r.vendor)vendors.add(r.vendor);
    if(r.customer)customers.add(r.customer);
  });
  document.getElementById('dashKpis').innerHTML=
    kpiHtml(fmtNum(totalHKD),'Sales (HKD)')+
    kpiHtml(fmtNum(totalUSD),'Sales (USD)')+
    kpiHtml(fmtQty(totalQty),'Quantity (Pcs)')+
    kpiHtml(dashFiltered.length.toLocaleString(),'Records')+
    kpiHtml(vendors.size.toLocaleString(),'Vendors')+
    kpiHtml(customers.size.toLocaleString(),'Customers');
}
function kpiHtml(val,lbl){
  return '<div class="kpi-card"><div class="kpi-val">'+val+'</div><div class="kpi-lbl">'+lbl+'</div></div>';
}
function fmtNum(n){
  if(n>=1e6)return(n/1e6).toFixed(1)+'M';
  if(n>=1e3)return(n/1e3).toFixed(1)+'K';
  return n.toFixed(0);
}
function fmtQty(n){
  if(n>=1e6)return(n/1e6).toFixed(1)+'M';
  if(n>=1e3)return(n/1e3).toFixed(0)+'K';
  return n.toLocaleString();
}

function renderChart(canvasId,groupKey,valueKey,type){
  var agg={};
  dashFiltered.forEach(function(r){
    var k=r[groupKey]||'Unknown';
    agg[k]=(agg[k]||0)+r[valueKey];
  });
  var entries=Object.entries(agg).sort(function(a,b){return b[1]-a[1];});
  var labels=entries.map(function(e){return e[0];});
  var data=entries.map(function(e){return e[1];});
  if(dashCharts[canvasId]){dashCharts[canvasId].destroy();}
  var ctx=document.getElementById(canvasId).getContext('2d');
  var cfg={
    type:type,
    data:{
      labels:labels,
      datasets:[{
        data:data,
        backgroundColor:DASH_COLORS.slice(0,labels.length),
        borderWidth:0,
        borderRadius:type==='bar'?4:0
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:true,
      plugins:{legend:{display:type==='doughnut',position:'right',labels:{font:{family:'DM Sans',size:11}}},
        tooltip:{callbacks:{label:function(ctx){return ctx.label+': '+fmtNum(ctx.raw);}}}},
      scales:type==='bar'?{y:{beginAtZero:true,ticks:{callback:function(v){return fmtNum(v);},font:{family:'Space Mono',size:10}}},x:{ticks:{font:{family:'DM Sans',size:11}}}}:{}
    }
  };
  if(type==='bar'){cfg.data.datasets[0].label=valueKey==='salesHKD'?'HKD':'Pcs';}
  dashCharts[canvasId]=new Chart(ctx,cfg);
}

function renderRfid(canvasId,rows){
  var rfid=0,other=0;
  rows.forEach(function(r){
    if((r.productType||'').toUpperCase()==='RFID') rfid+=r.salesHKD;
    else other+=r.salesHKD;
  });
  if(dashCharts[canvasId]){dashCharts[canvasId].destroy();}
  var ctx=document.getElementById(canvasId).getContext('2d');
  var total=rfid+other;
  dashCharts[canvasId]=new Chart(ctx,{
    type:'doughnut',
    data:{labels:['RFID','Other Products'],datasets:[{data:[rfid,other],backgroundColor:['#E21B1B','#1565C0'],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{position:'right',labels:{font:{family:'DM Sans',size:12}}},
        tooltip:{callbacks:{label:function(ctx){return ctx.label+': '+fmtNum(ctx.raw)+' ('+(total?Math.round(ctx.raw/total*100):0)+'%)';}}}
      }
    }
  });
}

function renderCustomers(canvasId,rows){
  var agg={};
  rows.forEach(function(r){
    var k=r.customer||'Unknown';
    agg[k]=(agg[k]||0)+r.salesHKD;
  });
  var entries=Object.entries(agg).sort(function(a,b){return b[1]-a[1];}).slice(0,15);
  var labels=entries.map(function(e){return e[0];});
  var data=entries.map(function(e){return e[1];});
  if(dashCharts[canvasId]){dashCharts[canvasId].destroy();}
  var ctx=document.getElementById(canvasId).getContext('2d');
  dashCharts[canvasId]=new Chart(ctx,{
    type:'bar',
    data:{labels:labels,datasets:[{label:'Sales HKD',data:data,backgroundColor:DASH_COLORS.slice(0,15),borderRadius:4,borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:true,indexAxis:'y',
      plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return fmtNum(ctx.raw)+' HKD';}}}},
      scales:{x:{beginAtZero:true,ticks:{callback:function(v){return fmtNum(v);},font:{family:'Space Mono',size:10}}},y:{ticks:{font:{family:'DM Sans',size:11}}}}
    }
  });
}

// === BRAND TAB ===
function renderBrandProduct(){
  var brands={};
  dashFiltered.forEach(function(r){
    var b=r.brand||'Unknown';
    if(!brands[b])brands[b]={};
    var pt=r.productType||'Unknown';
    brands[b][pt]=(brands[b][pt]||0)+r.salesHKD;
  });
  var brandNames=Object.keys(brands).sort(function(a,b){
    var ta=0,tb=0;Object.values(brands[a]).forEach(function(v){ta+=v;});Object.values(brands[b]).forEach(function(v){tb+=v;});return tb-ta;
  });
  var allPts=new Set();
  brandNames.forEach(function(b){Object.keys(brands[b]).forEach(function(pt){allPts.add(pt);});});
  var ptList=[...allPts].sort();
  var datasets=ptList.map(function(pt,i){
    return {label:pt,data:brandNames.map(function(b){return brands[b][pt]||0;}),backgroundColor:DASH_COLORS[i%DASH_COLORS.length],borderRadius:4,borderWidth:0};
  });
  if(dashCharts['chartBrandProduct']){dashCharts['chartBrandProduct'].destroy();}
  var ctx=document.getElementById('chartBrandProduct').getContext('2d');
  dashCharts['chartBrandProduct']=new Chart(ctx,{
    type:'bar',
    data:{labels:brandNames,datasets:datasets},
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{position:'top',labels:{font:{family:'DM Sans',size:10}}},tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': '+fmtNum(ctx.raw);}}}},
      scales:{x:{stacked:true,ticks:{font:{family:'DM Sans',size:11}}},y:{stacked:true,beginAtZero:true,ticks:{callback:function(v){return fmtNum(v);},font:{family:'Space Mono',size:10}}}}
    }
  });
}

function renderBrandRfid(){
  var brands={};
  dashFiltered.forEach(function(r){
    var b=r.brand||'Unknown';
    if(!brands[b])brands[b]={rfid:0,other:0};
    if((r.productType||'').toUpperCase()==='RFID')brands[b].rfid+=r.salesHKD;
    else brands[b].other+=r.salesHKD;
  });
  var brandNames=Object.keys(brands).sort(function(a,b){return(brands[b].rfid+brands[b].other)-(brands[a].rfid+brands[a].other);});
  if(dashCharts['chartBrandRfid']){dashCharts['chartBrandRfid'].destroy();}
  var ctx=document.getElementById('chartBrandRfid').getContext('2d');
  dashCharts['chartBrandRfid']=new Chart(ctx,{
    type:'bar',
    data:{labels:brandNames,datasets:[
      {label:'RFID',data:brandNames.map(function(b){return brands[b].rfid;}),backgroundColor:'#E21B1B',borderRadius:4,borderWidth:0},
      {label:'Other',data:brandNames.map(function(b){return brands[b].other;}),backgroundColor:'#1565C0',borderRadius:4,borderWidth:0}
    ]},
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{position:'top',labels:{font:{family:'DM Sans',size:11}}},tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': '+fmtNum(ctx.raw);}}}},
      scales:{x:{stacked:true,ticks:{font:{family:'DM Sans',size:11}}},y:{stacked:true,beginAtZero:true,ticks:{callback:function(v){return fmtNum(v);},font:{family:'Space Mono',size:10}}}}
    }
  });
}

function renderBrandMix(){
  var agg={};
  dashFiltered.forEach(function(r){var b=r.brand||'Unknown';agg[b]=(agg[b]||0)+r.salesHKD;});
  var entries=Object.entries(agg).sort(function(a,b){return b[1]-a[1];});
  if(dashCharts['chartBrandMix']){dashCharts['chartBrandMix'].destroy();}
  var ctx=document.getElementById('chartBrandMix').getContext('2d');
  var total=entries.reduce(function(s,e){return s+e[1];},0);
  dashCharts['chartBrandMix']=new Chart(ctx,{
    type:'doughnut',
    data:{labels:entries.map(function(e){return e[0];}),datasets:[{data:entries.map(function(e){return e[1];}),backgroundColor:DASH_COLORS.slice(0,entries.length),borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{position:'right',labels:{font:{family:'DM Sans',size:11}}},
        tooltip:{callbacks:{label:function(ctx){return ctx.label+': '+fmtNum(ctx.raw)+' ('+(total?Math.round(ctx.raw/total*100):0)+'%)';}}}
      }
    }
  });
}

function renderBrandCustomers(){
  var brand=document.getElementById('dashBrand').value;
  var rows=brand!=='all'?dashFiltered.filter(function(r){return r.brand===brand;}):dashFiltered;
  renderCustomers('chartBrandCustomers',rows);
}

// === PERIOD TAB ===
function getQuarter(monthNo){
  if(monthNo<=3)return 'Q1';if(monthNo<=6)return 'Q2';if(monthNo<=9)return 'Q3';return 'Q4';
}

function renderQuarterly(){
  var agg={};
  dashFiltered.forEach(function(r){
    var q=r.year+' '+getQuarter(r.monthNo);
    agg[q]=(agg[q]||0)+r.salesHKD;
  });
  var labels=Object.keys(agg).sort();
  var data=labels.map(function(l){return agg[l];});
  if(dashCharts['chartQuarter']){dashCharts['chartQuarter'].destroy();}
  var ctx=document.getElementById('chartQuarter').getContext('2d');
  dashCharts['chartQuarter']=new Chart(ctx,{
    type:'bar',
    data:{labels:labels,datasets:[{label:'Sales HKD',data:data,backgroundColor:labels.map(function(l){
      var y=l.split(' ')[0];return y==='2024'?'#1565C0':y==='2025'?'#2E7D32':'#E21B1B';
    }),borderRadius:4,borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return fmtNum(ctx.raw)+' HKD';}}}},
      scales:{y:{beginAtZero:true,ticks:{callback:function(v){return fmtNum(v);},font:{family:'Space Mono',size:10}}},x:{ticks:{font:{family:'DM Sans',size:11}}}}
    }
  });
}

function renderYoY(){
  var monthOrder=['January','February','March','April','May','June','July','August','September','October','November','December'];
  var years={};
  dashFiltered.forEach(function(r){
    var y=r.year||'Unknown';
    if(!years[y])years[y]={};
    years[y][r.month]=(years[y][r.month]||0)+r.salesHKD;
  });
  var yearList=Object.keys(years).sort();
  var allMonths=new Set();
  yearList.forEach(function(y){Object.keys(years[y]).forEach(function(m){allMonths.add(m);});});
  var months=[...allMonths].sort(function(a,b){return monthOrder.indexOf(a)-monthOrder.indexOf(b);});
  var yearColors={'2024':'#1565C0','2025':'#2E7D32','2026':'#E21B1B','2027':'#E8A317'};
  var datasets=yearList.map(function(y){
    return {label:y,data:months.map(function(m){return years[y][m]||0;}),borderColor:yearColors[y]||'#777',backgroundColor:(yearColors[y]||'#777')+'22',fill:true,tension:0.3,pointRadius:4,borderWidth:2};
  });
  if(dashCharts['chartYoY']){dashCharts['chartYoY'].destroy();}
  var ctx=document.getElementById('chartYoY').getContext('2d');
  dashCharts['chartYoY']=new Chart(ctx,{
    type:'line',
    data:{labels:months.map(function(m){return m.substring(0,3);}),datasets:datasets},
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{position:'top',labels:{font:{family:'DM Sans',size:11}}},tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': '+fmtNum(ctx.raw)+' HKD';}}}},
      scales:{y:{beginAtZero:true,ticks:{callback:function(v){return fmtNum(v);},font:{family:'Space Mono',size:10}}},x:{ticks:{font:{family:'DM Sans',size:11}}}}
    }
  });
}

function renderQByDimension(canvasId,dimKey){
  var agg={};
  dashFiltered.forEach(function(r){
    var q=r.year+' '+getQuarter(r.monthNo);
    var d=r[dimKey]||'Unknown';
    if(!agg[d])agg[d]={};
    agg[d][q]=(agg[d][q]||0)+r.salesHKD;
  });
  var dims=Object.entries(agg).sort(function(a,b){
    var ta=0,tb=0;Object.values(a[1]).forEach(function(v){ta+=v;});Object.values(b[1]).forEach(function(v){tb+=v;});return tb-ta;
  }).slice(0,8).map(function(e){return e[0];});
  var allQ=new Set();
  dims.forEach(function(d){Object.keys(agg[d]).forEach(function(q){allQ.add(q);});});
  var quarters=[...allQ].sort();
  var datasets=dims.map(function(d,i){
    return {label:d,data:quarters.map(function(q){return agg[d][q]||0;}),backgroundColor:DASH_COLORS[i%DASH_COLORS.length],borderRadius:4,borderWidth:0};
  });
  if(dashCharts[canvasId]){dashCharts[canvasId].destroy();}
  var ctx=document.getElementById(canvasId).getContext('2d');
  dashCharts[canvasId]=new Chart(ctx,{
    type:'bar',
    data:{labels:quarters,datasets:datasets},
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{position:'top',labels:{font:{family:'DM Sans',size:10}}},tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': '+fmtNum(ctx.raw);}}}},
      scales:{x:{stacked:false,ticks:{font:{family:'DM Sans',size:11}}},y:{beginAtZero:true,ticks:{callback:function(v){return fmtNum(v);},font:{family:'Space Mono',size:10}}}}
    }
  });
}

function renderTrend(){
  var monthOrder=['January','February','March','April','May','June','July','August','September','October','November','December'];
  var agg={};
  dashFiltered.forEach(function(r){
    var k=r.month||'Unknown';
    agg[k]=(agg[k]||0)+r.salesHKD;
  });
  var labels=Object.keys(agg).sort(function(a,b){return monthOrder.indexOf(a)-monthOrder.indexOf(b);});
  var data=labels.map(function(l){return agg[l];});
  if(dashCharts['chartTrend']){dashCharts['chartTrend'].destroy();}
  var ctx=document.getElementById('chartTrend').getContext('2d');
  dashCharts['chartTrend']=new Chart(ctx,{
    type:'bar',
    data:{labels:labels,datasets:[{
      label:'Sales HKD',data:data,
      backgroundColor:'#E21B1B',borderRadius:4,borderWidth:0
    }]},
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return fmtNum(ctx.raw)+' HKD';}}}},
      scales:{y:{beginAtZero:true,ticks:{callback:function(v){return fmtNum(v);},font:{family:'Space Mono',size:10}}},x:{ticks:{font:{family:'DM Sans',size:11}}}}
    }
  });
}
