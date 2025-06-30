const API = "/api/";

async function registerUser() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  }).then(r => r.json()).then(alert);
}

async function fetchProducts() {
  const res = await fetch(`${API}/products`);
  const products = await res.json();
  const list = document.getElementById("productList");
  list.innerHTML = "";
  products.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.name} - ₹${p.price}`;
    list.appendChild(li);
  });
}

async function addProduct() {
  const name = document.getElementById("prodName").value;
  const price = parseFloat(document.getElementById("prodPrice").value);
  await fetch(`${API}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, price })
  }).then(r => r.json()).then(alert);
}

async function addToCart() {
  const userId = document.getElementById("cartUserId").value;
  const productId = parseInt(document.getElementById("cartProdId").value);
  const quantity = parseInt(document.getElementById("cartQty").value);
  await fetch(`${API}/cart/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, quantity })
  }).then(r => r.json()).then(alert);
}

async function viewCart() {
  const userId = document.getElementById("cartUserId").value;
  const res = await fetch(`${API}/cart/${userId}`);
  const cart = await res.json();
  const list = document.getElementById("cartList");
  list.innerHTML = "";
  cart.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `Product ${item.productId} x ${item.quantity}`;
    list.appendChild(li);
  });
}

async function placeOrder() {
  const userId = document.getElementById("cartUserId").value;
  const res = await fetch(`${API}/cart/${userId}`);
  const cart = await res.json();
  const total = cart.reduce((sum, item) => sum + item.quantity * 3.5, 0); // dummy price
  await fetch(`${API}/orders/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: cart, total })
  }).then(r => r.json()).then(alert);
}

async function viewOrders() {
  const userId = document.getElementById("cartUserId").value;
  const res = await fetch(`${API}/orders/${userId}`);
  const orders = await res.json();
  const list = document.getElementById("orderList");
  list.innerHTML = "";
  orders.forEach(o => {
    const li = document.createElement("li");
    li.textContent = `Order #${o.orderId} - ₹${o.total} - ${o.timestamp}`;
    list.appendChild(li);
  });
}

