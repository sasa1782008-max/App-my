/* app.js
   نظام صفحة واحدة: إنشاء فاتورة + قوائم محفوظة (مبيعات، طلبات، حجز مسبق)
   حفظ في localStorage تحت: invoices_sales, invoices_orders, invoices_reservations
*/

const defaultItems = [
  "فراخ بيضاء","فراخ بلدي","بط","اوز","حمام","ارانب",
  "رومي","وراك","شيش","كبدة","كبد وقوانص","بانيه","صدور بعظم","هياكل"
];

/* عناصر DOM */
const tabs = document.querySelectorAll('.tab');
const createPanel = document.getElementById('createPanel');
const listsPanel = document.getElementById('listsPanel');
const listsTitle = document.getElementById('listsTitle');
const invoicesList = document.getElementById('invoicesList');

const itemsBody = document.getElementById('itemsBody');
const addNewBtn = document.getElementById('addNewBtn');
const newNameInput = document.getElementById('newName');

const orderListEl = document.getElementById('orderList');
const deliveryInput = document.getElementById('deliveryFee');
const subtotalEl = document.getElementById('subtotal');
const deliveryDisplayEl = document.getElementById('deliveryDisplay');
const grandTotalEl = document.getElementById('grandTotal');
const clearOrderBtn = document.getElementById('clearOrder');
const saveAndPrintBtn = document.getElementById('saveAndPrintBtn');
const saveOnlyBtn = document.getElementById('saveOnlyBtn');

const customerNameInput = document.getElementById('customerName');
const customerAddressInput = document.getElementById('customerAddress');
const customerPhoneInput = document.getElementById('customerPhone');
const orderTypeSelect = document.getElementById('orderType');

const viewModal = document.getElementById('viewModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');

let items = []; // {id,name}
let order = []; // [{uid,id,name,pricePerKg,qty,weight,lineTotal}]

// storage keys
const storageKeys = {
  sales: 'invoices_sales',
  orders: 'invoices_orders',
  reservations: 'invoices_reservations'
};

function init(){
  // init items
  items = defaultItems.map((n,i)=>({ id: 'it'+i, name: n }));
  renderItemsTable();
  renderOrder();

  // events
  addNewBtn.addEventListener('click', onAddNewItem);
  deliveryInput.addEventListener('input', updateTotals);
  clearOrderBtn.addEventListener('click', onClearOrder);
  saveAndPrintBtn.addEventListener('click', ()=>onSaveInvoice({ print:true }));
  saveOnlyBtn.addEventListener('click', ()=>onSaveInvoice({ print:false }));

  // modal
  closeModal.addEventListener('click', ()=> { viewModal.classList.add('hidden'); });

  // tabs
  tabs.forEach(t => t.addEventListener('click', onTabClick));
}

// ---- Tabs ----
function onTabClick(e){
  const tab = e.currentTarget;
  tabs.forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  const name = tab.dataset.tab;
  if(name === 'create'){
    listsPanel.classList.add('hidden');
    createPanel.classList.remove('hidden');
  } else {
    createPanel.classList.add('hidden');
    listsPanel.classList.remove('hidden');
    // render list for this category
    if(name === 'sales') renderInvoicesList('sales');
    if(name === 'orders') renderInvoicesList('orders');
    if(name === 'reservations') renderInvoicesList('reservations');
  }
}

// ---- Items table ----
function renderItemsTable(){
  itemsBody.innerHTML = '';
  items.forEach(it=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:right;padding:8px">${escapeHtml(it.name)}</td>
      <td><input class="price" data-id="${it.id}" type="number" step="0.01" min="0" placeholder="سعر الكيلو" /></td>
      <td><input class="qty" data-id="${it.id}" type="number" step="1" min="0" placeholder="الكمية" /></td>
      <td><input class="weight" data-id="${it.id}" type="number" step="0.01" min="0" placeholder="الوزن (كجم)" /></td>
      <td><button class="btn add-btn" data-id="${it.id}">أضف</button></td>
      <td><button class="btn" data-id="${it.id}" onclick="deleteItemById('${it.id}')">حذف</button></td>
    `;
    itemsBody.appendChild(tr);
  });

  // attach add events
  document.querySelectorAll('.add-btn').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.currentTarget.dataset.id;
      const name = items.find(x=>x.id===id).name;
      const price = parseFloat(document.querySelector(`.price[data-id="${id}"]`).value) || 0;
      const qty = parseFloat(document.querySelector(`.qty[data-id="${id}"]`).value) || 0;
      const weight = parseFloat(document.querySelector(`.weight[data-id="${id}"]`).value) || 0;

      if (price <= 0) { alert('حدد سعر الكيلو للصنف'); return; }
      if (qty <= 0) { alert('حدد الكمية'); return; }
      if (weight <= 0) { alert('حدد الوزن'); return; }

      addToOrder({id,name,pricePerKg:price,qty,weight});
    });
  });
}

function deleteItemById(id){
  if(!confirm('هل تود حذف هذا الصنف من قائمة الأصناف؟')) return;
  items = items.filter(x=>x.id !== id);
  renderItemsTable();
}

function onAddNewItem(){
  const name = newNameInput.value.trim();
  if(!name){ alert('اكتب اسم الصنف الجديد'); return; }
  const id = 'it' + (Date.now());
  items.push({ id, name });
  newNameInput.value = '';
  renderItemsTable();
  setTimeout(()=> {
    const el = document.querySelector(`.add-btn[data-id="${id}"]`);
    if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
  },150);
}

// ---- Order ----
function addToOrder(itemData){
  const lineTotal = parseFloat(itemData.pricePerKg) * parseFloat(itemData.weight) * parseFloat(itemData.qty);
  const entry = {
    uid: 'o' + Date.now() + Math.floor(Math.random()*1000),
    id: itemData.id,
    name: itemData.name,
    pricePerKg: Number(itemData.pricePerKg),
    qty: Number(itemData.qty),
    weight: Number(itemData.weight),
    lineTotal: Number(lineTotal)
  };
  order.push(entry);
  renderOrder();
}

function renderOrder(){
  orderListEl.innerHTML = '';
  if(order.length === 0){
    orderListEl.innerHTML = '<p class="muted">لم يتم إضافة أصناف بعد.</p>';
  } else {
    order.forEach((o, idx)=>{
      const div = document.createElement('div');
      div.className = 'order-item';
      div.innerHTML = `
        <div class="meta">
          <strong>${escapeHtml(o.name)}</strong>
          <small>سعر/كيلو: ${o.pricePerKg.toFixed(2)} ج — الكمية: ${o.qty} — الوزن: ${o.weight} كجم</small>
        </div>
        <div style="text-align:left">
          <div><strong>${o.lineTotal.toFixed(2)} ج</strong></div>
          <div style="margin-top:6px;display:flex;gap:6px;justify-content:flex-end">
            <button class="btn" data-idx="${idx}" onclick="removeOrderItem(${idx})">حذف</button>
          </div>
        </div>
      `;
      orderListEl.appendChild(div);
    });
  }
  updateTotals();
}

function removeOrderItem(index){
  if(!confirm('هل تود حذف هذا الصنف من الأوردر؟')) return;
  order.splice(index,1);
  renderOrder();
}

function onClearOrder(){
  if(!confirm('هل تريد تفريغ الأوردر بالكامل؟')) return;
  order = [];
  renderOrder();
}

function updateTotals(){
  let subtotal = 0;
  order.forEach(o=> subtotal += o.lineTotal);
  const delivery = parseFloat(deliveryInput.value) || 0;
  subtotalEl.textContent = subtotal.toFixed(2) + ' ج';
  deliveryDisplayEl.textContent = delivery.toFixed(2) + ' ج';
  grandTotalEl.textContent = (subtotal + delivery).toFixed(2) + ' ج';
}

// ---- Save / Storage ----
function onSaveInvoice({ print=false }){
  if(order.length === 0){ alert('لا يوجد أصناف في الأوردر للحفظ.'); return; }
  const delivery = parseFloat(deliveryInput.value);
  if(isNaN(delivery)){ alert('قيمة التوصيل مطلوبة (اكتب مبلغ التوصيل)'); return; }

  const subtotal = order.reduce((s,o)=>s + o.lineTotal, 0);
  const grand = subtotal + delivery;

  const name = customerNameInput.value.trim();
  const addr = customerAddressInput.value.trim();
  const phone = customerPhoneInput.value.trim();
  const orderType = orderTypeSelect.value || 'sales';

  const invoice = {
    id: 'inv_' + Date.now(),
    createdAt: new Date().toISOString(),
    customer: { name, address: addr, phone },
    items: order.map(o=>({ name:o.name, pricePerKg:o.pricePerKg, qty:o.qty, weight:o.weight, lineTotal:o.lineTotal })),
    subtotal, delivery, grand,
    orderType
  };

  saveInvoiceToCategory(orderType, invoice);
  alert('الفاتورة اتحفظت في ' + (orderType === 'sales' ? 'المبيعات' : orderType === 'orders' ? 'الطلبات' : 'الحجز المسبق'));

  // clear order after save (optional) — keep as UX choice; here نفضي الأوردر
  order = [];
  renderOrder();

  if(print) printInvoiceWindow(invoice);
}

function saveInvoiceToCategory(category, invoiceObj){
  const key = storageKeys[category];
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  list.unshift(invoiceObj); // newest first
  localStorage.setItem(key, JSON.stringify(list));
}

// ---- Render invoices lists ----
function renderInvoicesList(category){
  const key = storageKeys[category];
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  invoicesList.innerHTML = '';
  listsTitle.textContent = category === 'sales' ? 'فواتير المبيعات' : category === 'orders' ? 'فواتير الطلبات' : 'فواتير الحجز المسبق';

  if(list.length === 0){
    invoicesList.innerHTML = '<p class="muted">لا توجد فواتير محفوظة هنا.</p>';
    return;
  }

  list.forEach(inv => {
    const row = document.createElement('div');
    row.className = 'invoice-row';
    const created = new Date(inv.createdAt).toLocaleString('ar-EG');
    row.innerHTML = `
      <div class="meta">
        <strong>${inv.customer.name || '— اسم غير مسجل —'}</strong>
        <small>المجموع: ${inv.grand.toFixed(2)} ج — ${created}</small>
      </div>
      <div class="actions">
        <button class="btn" data-id="${inv.id}" onclick="viewInvoice('${category}','${inv.id}')">عرض</button>
        <button class="btn primary" onclick="reprintInvoice('${category}','${inv.id}')">طباعة</button>
        <button class="btn warn" onclick="deleteInvoice('${category}','${inv.id}')">حذف</button>
      </div>
    `;
    invoicesList.appendChild(row);
  });
}

// ---- view / print / delete helpers ----
function viewInvoice(category, id){
  const key = storageKeys[category];
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  const inv = list.find(x=>x.id === id);
  if(!inv) { alert('الفاتورة مش لاقيها'); return; }

  // build HTML
  let html = `<h3>فاتورة — ${category === 'sales' ? 'مبيعات' : category === 'orders' ? 'طلبات' : 'حجز مسبق'}</h3>`;
  html += `<div><strong>اسم العميل:</strong> ${escapeHtml(inv.customer.name || '')}</div>`;
  html += `<div><strong>عنوان العميل:</strong> ${escapeHtml(inv.customer.address || '')}</div>`;
  html += `<div><strong>رقم العميل:</strong> ${escapeHtml(inv.customer.phone || '')}</div>`;
  html += `<table style="width:100%;border-collapse:collapse;margin-top:12px"><thead><tr><th>الصنف</th><th>السعر/كجم</th><th>الكمية</th><th>الوزن</th><th>المجموع</th></tr></thead><tbody>`;
  inv.items.forEach(it=>{
    html += `<tr><td style="padding:6px;border-bottom:1px solid #ddd">${escapeHtml(it.name)}</td><td style="text-align:center">${it.pricePerKg.toFixed(2)}</td><td style="text-align:center">${it.qty}</td><td style="text-align:center">${it.weight}</td><td style="text-align:left">${it.lineTotal.toFixed(2)}</td></tr>`;
  });
  html += `</tbody></table>`;
  html += `<div style="margin-top:8px"><strong>المجموع الفرعي:</strong> ${inv.subtotal.toFixed(2)} ج</div>`;
  html += `<div><strong>رسوم التوصيل:</strong> ${inv.delivery.toFixed(2)} ج</div>`;
  html += `<div style="font-weight:700;margin-top:6px"><strong>الإجمالي:</strong> ${inv.grand.toFixed(2)} ج</div>`;
  html += `<div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end"><button class="btn" onclick="printInvoiceWindowFromData('${category}','${id}')">طباعة</button></div>`;

  modalBody.innerHTML = html;
  viewModal.classList.remove('hidden');
}

function reprintInvoice(category, id){
  const key = storageKeys[category];
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  const inv = list.find(x=>x.id === id);
  if(!inv) { alert('الفاتورة مش لاقيها'); return; }
  printInvoiceWindow(inv);
}

function deleteInvoice(category, id){
  if(!confirm('هل تريد حذف هذه الفاتورة نهائياً؟')) return;
  const key = storageKeys[category];
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  const newList = list.filter(x=>x.id !== id);
  localStorage.setItem(key, JSON.stringify(newList));
  // refresh view
  // find active tab
  const activeTab = document.querySelector('.tab.active').dataset.tab;
  if(activeTab === 'sales' || activeTab === 'orders' || activeTab === 'reservations') renderInvoicesList(activeTab);
}

// helper to call from modal print button
function printInvoiceWindowFromData(category, id){
  const key = storageKeys[category];
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  const inv = list.find(x=>x.id === id);
  if(inv) printInvoiceWindow(inv);
}

/* printing: builds HTML for an invoice object and opens window.print */
function printInvoiceWindow(inv){
  const itemsHtml = inv.items.map(o=>`
    <tr>
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${escapeHtml(o.name)}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center">${o.pricePerKg.toFixed(2)}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center">${o.qty}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center">${o.weight}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:left">${o.lineTotal.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
  <!doctype html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8"><title>فاتورة — طيور الهدى</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;direction:rtl;color:#111;padding:18px}
      h1{margin:0;color:#0b2d52}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{background:#f1f5f9;padding:8px;text-align:center}
      td{font-size:14px}
      .totals{margin-top:12px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}
      .totals .row{display:flex;justify-content:space-between;width:320px}
      .footer{margin-top:30px;border-top:1px dashed #ccc;padding-top:10px;font-size:13px}
    </style>
  </head>
  <body>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <h1>طيور الهدى</h1>
        <div>ادارة محمد ابو نور</div>
      </div>
      <div style="text-align:left">
        <div>01027327294</div>
        <div style="margin-top:6px">01061640207
          <svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:middle;margin-left:6px" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#e60000"></circle><path d="M12 7.5c-2 0-3.2 1.6-3.2 3.9 0 2.2 1.2 3.9 3.2 3.9s3.2-1.7 3.2-3.9C15.2 9.1 14 7.5 12 7.5z" fill="#fff"/></svg>
        </div>
      </div>
    </div>

    ${ inv.customer.name ? `<div style="margin-top:8px"><strong>اسم العميل:</strong> ${escapeHtml(inv.customer.name)}</div>` : '' }
    ${ inv.customer.address ? `<div><strong>عنوان العميل:</strong> ${escapeHtml(inv.customer.address)}</div>` : '' }
    ${ inv.customer.phone ? `<div><strong>رقم العميل:</strong> ${escapeHtml(inv.customer.phone)}</div>` : '' }

    <div style="margin-top:8px"><strong>نوع الحفظ:</strong> ${inv.orderType === 'sales' ? 'مبيعات' : inv.orderType === 'orders' ? 'طلبات' : 'حجز مسبق'}</div>

    <table>
      <thead>
        <tr>
          <th>الصنف</th>
          <th>السعر/كيلو (ج)</th>
          <th>الكمية</th>
          <th>الوزن (كجم)</th>
          <th>المجموع (ج)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><strong>المجموع الفرعي:</strong><span>${inv.subtotal.toFixed(2)} ج</span></div>
      <div class="row"><strong>رسوم التوصيل:</strong><span>${inv.delivery.toFixed(2)} ج</span></div>
      <div class="row" style="font-size:18px"><strong>الإجمالي:</strong><span>${inv.grand.toFixed(2)} ج</span></div>
    </div>

    <div class="footer">
      <div><strong>طيور الهدى</strong> — ادارة محمد ابو نور</div>
      <div style="margin-top:6px">01027327294 — 01061640207</div>
    </div>

    <script>window.onload=function(){window.print();}</script>
  </body>
  </html>
  `;

  const w = window.open('', '_blank');
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// ---- helpers ----
function escapeHtml(s){
  if(!s) return '';
  return String(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});
}

// expose some functions to window for inline onclick used in generated HTML
window.deleteItemById = deleteItemById;
window.removeOrderItem = removeOrderItem;
window.viewInvoice = viewInvoice;
window.reprintInvoice = reprintInvoice;
window.deleteInvoice = deleteInvoice;
window.printInvoiceWindowFromData = printInvoiceWindowFromData;

init();