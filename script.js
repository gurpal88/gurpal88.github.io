/* Fully functional frontend-only Dairy Management app
   Persistent in localStorage. */

const KEY = "dairy_pro_v1";
let data = JSON.parse(localStorage.getItem(KEY)) || { locations: {} };
let currentLocation = null;

/* Utility */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const save = () => localStorage.setItem(KEY, JSON.stringify(data));
const $ = id => document.getElementById(id);

/* DOM refs created after load */
document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const locationList = document.querySelector("#locationList");
  const addLocationBtn = document.querySelector("#addLocationBtn");
  const sideBtns = document.querySelectorAll(".side-btn");
  const tabViews = document.querySelectorAll(".tab-view");
  const currentLocationTitle = document.querySelector("#currentLocationTitle");
  const dashLocation = document.querySelector("#dashLocation");
  const dashInfo = document.querySelector("#dashInfo");
  const dashLiters = document.querySelector("#dashLiters");
  const dashAmount = document.querySelector("#dashAmount");
  const dashCustomers = document.querySelector("#dashCustomers");
  const globalSearch = document.querySelector("#globalSearch");
  const searchBtn = document.querySelector("#searchBtn");
  const clearSearchBtn = document.querySelector("#clearSearchBtn");

  // ensure at least one location
  if (Object.keys(data.locations).length === 0) {
    const name = "Main Farm";
    data.locations[name] = { customers: [], products: [], entries: [] };
    save();
  }
  currentLocation = currentLocation || Object.keys(data.locations)[0];

  /* Render sidebar locations */
  function renderLocations(){
    locationList.innerHTML = "";
    Object.keys(data.locations).forEach(loc => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="loc-name">${loc}</span>
        <div>
          <button class="icon-btn select" data-loc="${loc}">Select</button>
          <button class="icon-btn del" data-loc="${loc}">🗑</button>
        </div>`;
      if (loc === currentLocation) li.classList.add("active");
      locationList.appendChild(li);
    });

    // attach events
    locationList.querySelectorAll("button.select").forEach(b=>{
      b.onclick = () => { currentLocation = b.dataset.loc; renderAll(); };
    });
    locationList.querySelectorAll("button.del").forEach(b=>{
      b.onclick = () => {
        const name = b.dataset.loc;
        if (!confirm(`Delete location "${name}"? This will remove data for that location.`)) return;
        delete data.locations[name];
        const keys = Object.keys(data.locations);
        currentLocation = keys.length ? keys[0] : null;
        save(); renderAll();
      };
    });
  }

  /* Add location */
  addLocationBtn.onclick = () => {
    const name = prompt("New location name:");
    if (!name) return;
    if (data.locations[name]) return alert("Location already exists.");
    data.locations[name] = { customers: [], products: [], entries: [] };
    currentLocation = name;
    save(); renderAll();
  };

  /* Side navigation */
  sideBtns.forEach(btn=>{
    btn.onclick = () => {
      sideBtns.forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      tabViews.forEach(tv => tv.classList.remove("active"));
      document.getElementById(tab).classList.add("active");
      if (tab === "dashboard") renderDashboard();
      if (tab === "customers") renderCustomers();
      if (tab === "products") renderProducts();
      if (tab === "entries") renderEntries();
      if (tab === "summary") renderSummary();
    };
  });

  /* RENDER ALL */
  function renderAll(){
    renderLocations();
    currentLocationTitle.textContent = currentLocation ? `📍 ${currentLocation}` : "No location selected";
    renderDashboard();
    // if a specific tab is active, re-render it:
    const activeTab = document.querySelector(".side-btn.active").dataset.tab;
    if (activeTab === "customers") renderCustomers();
    if (activeTab === "products") renderProducts();
    if (activeTab === "entries") renderEntries();
    if (activeTab === "summary") renderSummary();
  }

  /* DASHBOARD */
  function renderDashboard(){
    if (!currentLocation) { dashLocation.textContent = "—"; dashInfo.textContent = "Select a location"; return; }
    dashLocation.textContent = currentLocation;
    const loc = data.locations[currentLocation];
    // totals for current month
    const now = new Date(), month = now.getMonth(), year = now.getFullYear();
    let totalL = 0, totalAmt = 0;
    loc.entries.forEach(e=>{
      const d = new Date(e.date);
      if (d.getMonth()===month && d.getFullYear()===year){ totalL += Number(e.qty); totalAmt += Number(e.amount); }
    });
    dashLiters.textContent = `${totalL.toFixed(2)} L`;
    dashAmount.textContent = `₹ ${totalAmt.toFixed(2)}`;
    dashCustomers.textContent = loc.customers.length;
    dashInfo.textContent = `${loc.entries.length} total entries`;
  }

  /* CUSTOMERS */
  const customersTableBody = document.querySelector("#customersTable tbody");
  function renderCustomers(){
    document.querySelector("#customersLocation").textContent = currentLocation || "No location";
    customersTableBody.innerHTML = "";
    if (!currentLocation) return;
    const loc = data.locations[currentLocation];
    loc.customers.forEach(c=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${c.name}</td><td>${c.phone||''}</td><td>₹${(c.balance||0).toFixed(2)}</td>
        <td>
          <button class="btn" data-cid="${c.id}" onclick="viewCustomer('${c.id}')">View</button>
          <button class="btn subtle" data-cid="${c.id}" onclick="editCustomer('${c.id}')">Edit</button>
          <button class="btn subtle" data-cid="${c.id}" onclick="delCustomer('${c.id}')">Delete</button>
        </td>`;
      customersTableBody.appendChild(tr);
    });
  }

  /* PRODUCTS */
  const productsTableBody = document.querySelector("#productsTable tbody");
  function renderProducts(){
    document.querySelector("#productsLocation").textContent = currentLocation || "No location";
    productsTableBody.innerHTML = "";
    if (!currentLocation) return;
    const loc = data.locations[currentLocation];
    loc.products.forEach(p=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${p.name}</td><td>₹${Number(p.rate).toFixed(2)}</td>
        <td>
          <button class="btn" onclick="editProduct('${p.id}')">Edit</button>
          <button class="btn subtle" onclick="deleteProduct('${p.id}')">Delete</button>
        </td>`;
      productsTableBody.appendChild(tr);
    });
  }

  /* ENTRIES */
  const entriesTableBody = document.querySelector("#entriesTable tbody");
  function renderEntries(){
    document.querySelector("#entriesLocation").textContent = currentLocation || "No location";
    if (!currentLocation) return;
    const loc = data.locations[currentLocation];
    // fill selects
    const custSel = document.querySelector("#entryCustomer");
    const prodSel = document.querySelector("#entryProduct");
    custSel.innerHTML = `<option value="">-- choose customer --</option>` + loc.customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
    prodSel.innerHTML = `<option value="">-- choose product --</option>` + loc.products.map(p=>`<option value="${p.id}" data-rate="${p.rate}">${p.name}</option>`).join("");

    // entries table
    entriesTableBody.innerHTML = "";
    loc.entries.slice().reverse().forEach(e=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${e.date}</td><td>${e.customerName}</td><td>${e.productName}</td><td>${Number(e.qty).toFixed(2)}</td><td>₹${Number(e.rate).toFixed(2)}</td><td>₹${Number(e.amount).toFixed(2)}</td>
        <td><button class="btn subtle" onclick="deleteEntry('${e.id}')">Delete</button></td>`;
      entriesTableBody.appendChild(tr);
    });
  }

  /* SUMMARY */
  function renderSummary(){
    document.querySelector("#summaryLocation").textContent = currentLocation || "No location";
    document.querySelector("#summaryResult").innerHTML = "";
  }

  /* Add customer modal */
  document.querySelector("#btnAddCustomer").onclick = () => {
    if (!currentLocation) return alert("Select a location first");
    const name = prompt("Customer name:");
    if (!name) return;
    const phone = prompt("Phone (optional):") || "";
    const id = uid();
    data.locations[currentLocation].customers.push({ id, name, phone, balance:0, history:[] });
    save(); renderCustomers(); renderDashboard();
  };

  /* Add product */
  document.querySelector("#btnAddProduct").onclick = () => {
    if (!currentLocation) return alert("Select a location first");
    const name = prompt("Product name (e.g. Milk):");
    if (!name) return;
    const rateStr = prompt("Rate per unit (₹):", "50");
    const rate = parseFloat(rateStr);
    if (isNaN(rate)) return alert("Invalid rate");
    const id = uid();
    data.locations[currentLocation].products.push({ id, name, rate });
    save(); renderProducts(); renderEntries(); renderDashboard();
  };

  /* Entry form interactions */
  document.querySelector("#entryProduct").addEventListener("change", (e)=>{
    const opt = e.target.selectedOptions[0];
    const rate = opt ? opt.dataset.rate : '';
    document.querySelector("#entryRate").value = rate || '';
    updateEntryAmount();
  });
  document.querySelector("#entryQty").addEventListener("input", updateEntryAmount);
  document.querySelector("#entryRate").addEventListener("input", updateEntryAmount);
  function updateEntryAmount(){
    const q = parseFloat(document.querySelector("#entryQty").value) || 0;
    const r = parseFloat(document.querySelector("#entryRate").value) || 0;
    document.querySelector("#entryAmount").value = (q * r).toFixed(2);
  }

  document.querySelector("#saveEntryBtn").onclick = () => {
    if (!currentLocation) return alert("Select a location first");
    const custId = document.querySelector("#entryCustomer").value;
    const prodId = document.querySelector("#entryProduct").value;
    const date = document.querySelector("#entryDate").value || new Date().toISOString().slice(0,10);
    const qty = parseFloat(document.querySelector("#entryQty").value);
    const rate = parseFloat(document.querySelector("#entryRate").value);
    if (!custId || !prodId || isNaN(qty) || isNaN(rate)) return alert("Fill all fields");
    const loc = data.locations[currentLocation];
    const cust = loc.customers.find(c=>c.id===custId);
    const prod = loc.products.find(p=>p.id===prodId);
    const amount = Number((qty * rate).toFixed(2));
    const entry = { id: uid(), date, customerId: custId, customerName: cust.name, productId: prodId, productName: prod.name, qty, rate, amount };
    loc.entries.push(entry);
    // update customer's balance and history
    cust.balance = (cust.balance || 0) + amount;
    cust.history = cust.history || [];
    cust.history.push({ date, product: prod.name, qty, rate, amount });
    save(); renderEntries(); renderCustomers(); renderDashboard();
    // clear inputs
    document.querySelector("#entryDate").value = '';
    document.querySelector("#entryQty").value = '';
    document.querySelector("#entryRate").value = '';
    document.querySelector("#entryAmount").value = '';
    document.querySelector("#entryProduct").value = '';
    document.querySelector("#entryCustomer").value = '';
  };

  document.querySelector("#clearEntryBtn").onclick = () => {
    document.querySelector("#entryDate").value = '';
    document.querySelector("#entryQty").value = '';
    document.querySelector("#entryRate").value = '';
    document.querySelector("#entryAmount").value = '';
    document.querySelector("#entryProduct").value = '';
    document.querySelector("#entryCustomer").value = '';
  };

  /* Delete helpers exposed globally */
  window.deleteEntry = (id) => {
    if (!confirm("Delete entry?")) return;
    const loc = data.locations[currentLocation];
    const entry = loc.entries.find(e=>e.id===id);
    if (entry){
      // subtract from customer
      const cust = loc.customers.find(c=>c.id===entry.customerId);
      if (cust){ cust.balance = (cust.balance || 0) - entry.amount; cust.history = (cust.history||[]).filter(h=>!(h.date===entry.date && h.amount===entry.amount && h.qty===entry.qty)); }
    }
    loc.entries = loc.entries.filter(e=>e.id!==id);
    save(); renderEntries(); renderCustomers(); renderDashboard();
  };

  window.editCustomer = (id) => {
    const loc = data.locations[currentLocation];
    const c = loc.customers.find(x=>x.id===id);
    if (!c) return;
    const name = prompt("Edit name:", c.name);
    if (!name) return;
    const phone = prompt("Phone:", c.phone||"") || "";
    c.name = name; c.phone = phone;
    save(); renderCustomers(); renderEntries();
  };

  window.delCustomer = (id) => {
    if (!confirm("Delete customer and their entries?")) return;
    const loc = data.locations[currentLocation];
    loc.customers = loc.customers.filter(c=>c.id!==id);
    loc.entries = loc.entries.filter(e=>e.customerId!==id);
    save(); renderCustomers(); renderEntries(); renderDashboard();
  };

  window.openCustomer = (id) => {
    const loc = data.locations[currentLocation];
    const c = loc.customers.find(x=>x.id===id);
    if (!c) return alert("Customer not found");
    const hist = (c.history||[]).map(h=>`${h.date} • ${h.product} • ${h.qty}L • ₹${h.amount}`).join("\n") || "No entries";
    alert(`Name: ${c.name}\nPhone: ${c.phone||'-'}\nBalance: ₹${(c.balance||0).toFixed(2)}\n\nHistory:\n${hist}`);
  };

  window.editProduct = (id) => {
    const loc = data.locations[currentLocation];
    const p = loc.products.find(x=>x.id===id);
    if (!p) return;
    const name = prompt("Product name:", p.name); if(!name) return;
    const rate = parseFloat(prompt("Rate:", p.rate)); if(isNaN(rate)) return alert("Invalid rate");
    p.name = name; p.rate = rate; save(); renderProducts(); renderEntries();
  };

  window.deleteProduct = (id) => {
    if (!confirm("Delete product and related entries?")) return;
    const loc = data.locations[currentLocation];
    loc.products = loc.products.filter(p=>p.id!==id);
    loc.entries = loc.entries.filter(e=>e.productId!==id);
    save(); renderProducts(); renderEntries(); renderDashboard();
  };

  /* search */
  searchBtn.onclick = () => {
    const q = (globalSearch.value || "").trim().toLowerCase();
    if (!q) return alert("Type to search");
    const res = [];
    Object.keys(data.locations).forEach(locName => {
      const loc = data.locations[locName];
      loc.customers.forEach(c => { if (c.name.toLowerCase().includes(q)) res.push(`${c.name} — customer @ ${locName}`); });
      loc.products.forEach(p => { if (p.name.toLowerCase().includes(q)) res.push(`${p.name} — product @ ${locName}`); });
    });
    if (res.length === 0) alert("No results");
    else alert(res.slice(0,50).join("\n"));
  };
  clearSearchBtn.onclick = () => { globalSearch.value = ""; renderAll(); };

  /* summary */
  document.querySelector("#showSummaryBtn").onclick = () => {
    if (!currentLocation) return alert("Select a location");
    const monthInput = document.querySelector("#summaryMonth").value;
    if (!monthInput) return alert("Choose month");
    const [y,m] = monthInput.split("-");
    const from = new Date(y, Number(m)-1, 1);
    const to = new Date(y, Number(m)-1 +1, 0);
    const loc = data.locations[currentLocation];
    const rows = loc.entries.filter(e => { const d = new Date(e.date); return d >= from && d <= to; });
    const totals = {};
    let totalQty=0, totalAmt=0;
    rows.forEach(r=>{
      totals[r.customerName] = (totals[r.customerName] || 0) + Number(r.qty);
      totalQty += Number(r.qty);
      totalAmt += Number(r.amount);
    });
    const html = `<p>Total liters: ${totalQty.toFixed(2)} L — Total amount: ₹${totalAmt.toFixed(2)}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead><tr><th>Customer</th><th>Total Liters</th></tr></thead>
        <tbody>${Object.keys(totals).map(c=>`<tr><td>${c}</td><td>${totals[c].toFixed(2)}</td></tr>`).join("")}</tbody>
      </table>`;
    document.querySelector("#summaryResult").innerHTML = html;
  };

  /* initial render */
  renderAll();

  // helper to expose a couple functions to global for inline onclick usage
  window.renderAll = renderAll;
});

/* Expose global stubs used in row buttons (they reference global functions) */
window.viewCustomer = (id)=> window.openCustomer && window.openCustomer(id);
window.editCustomer = (id)=> window.editCustomer && window.editCustomer(id);
window.delCustomer = (id)=> window.delCustomer && window.delCustomer(id);
