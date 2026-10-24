import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Credenciales oficiales de refripro-app
const firebaseConfig = {
  apiKey: "AIzaSyDL6-BNv2HGCDGzKPHhfBTglCy8rM5WVKs",
  authDomain: "refripro-app.firebaseapp.com",
  projectId: "refripro-app",
  storageBucket: "refripro-app.firebasestorage.app",
  messagingSenderId: "821949581789",
  appId: "1:821949581789:web:efb2548ac95fa22a974e34",
  measurementId: "G-E30WMD3QZE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const bookingsCol = collection(db, "reservas");

// Control de Modales
window.openModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
};

window.closeModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
};

window.closeOnBackdrop = function(e, id) {
  if (e.target.id === id) window.closeModal(id);
};

window.openBookingModal = function(serviceName = null) {
  document.querySelectorAll(".modal-backdrop.active").forEach(m => m.classList.remove("active"));
  const modal = document.getElementById("modal-booking");
  const form = document.getElementById("bookingForm");
  const successBox = document.getElementById("bookingSuccessBox");

  if (!modal) return;
  form.style.display = "block";
  successBox.style.display = "none";

  if (serviceName) {
    const serviceSelect = document.getElementById("serviceType");
    if (serviceSelect) serviceSelect.value = serviceName;
  }

  const today = new Date().toISOString().split("T")[0];
  const dateInput = document.getElementById("bookingDate");
  if (dateInput) {
    dateInput.min = today;
    if (!dateInput.value) dateInput.value = today;
  }

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
};

window.switchToBooking = function(serviceName) {
  window.openBookingModal(serviceName);
};

// Alta de Reserva
window.handleBookingSubmit = async function(event) {
  event.preventDefault();
  const submitBtn = event.target.querySelector("button[type='submit']");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "REGISTRANDO EN NODO FIREBASE...";
  }

  const name = document.getElementById("clientName").value.trim();
  const phone = document.getElementById("clientPhone").value.trim();
  const address = document.getElementById("clientAddress").value.trim();
  const service = document.getElementById("serviceType").value;
  const date = document.getElementById("bookingDate").value;
  const time = document.getElementById("bookingTime").value;

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const bookingCode = `REF-${randomNum}`;

  try {
    await addDoc(bookingsCol, {
      code: bookingCode,
      name: name,
      phone: phone,
      address: address,
      service: service,
      date: date,
      time: time,
      status: "Pendiente",
      createdAt: new Date().toISOString()
    });

    document.getElementById("bookingForm").style.display = "none";
    const successBox = document.getElementById("bookingSuccessBox");
    successBox.style.display = "block";
    document.getElementById("generatedCodeDisplay").textContent = bookingCode;

    const message = `*SOLICITUD DE VISITA TÉCNICA*%0A` +
      `--------------------------------%0A` +
      `🔖 *Código:* ${bookingCode}%0A` +
      `👤 *Cliente:* ${name}%0A` +
      `📞 *Teléfono:* ${phone}%0A` +
      `📍 *Dirección:* ${address}%0A` +
      `🛠️ *Servicio:* ${service}%0A` +
      `📅 *Fecha solicitada:* ${date}%0A` +
      `⏰ *Horario:* ${time}%0A` +
      `--------------------------------%0A` +
      `⚠️ _Entiendo que la visita técnica a domicilio posee un costo operativo de revisión._`;

    document.getElementById("btnSendWhatsAppBooking").href = `https://wa.me/541133732345?text=${message}`;
  } catch (error) {
    alert("Error de conexión a la base de datos: " + error.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = "Confirmar y Generar Código de Reserva ►";
    }
  }
};

// Verificación de Estado
window.checkReservationStatus = async function() {
  const input = document.getElementById("inputCheckCode");
  const resultBox = document.getElementById("checkResultBox");
  if (!input || !resultBox) return;

  const searchCode = input.value.trim().toUpperCase();
  if (!searchCode) {
    resultBox.style.display = "block";
    resultBox.className = "check-terminal-output output-pending";
    resultBox.innerHTML = "Ingresa un código válido (ej: REF-1234).";
    return;
  }

  resultBox.style.display = "block";
  resultBox.className = "check-terminal-output output-pending";
  resultBox.innerHTML = "Buscando en registros centrales...";

  try {
    const snapshot = await getDocs(bookingsCol);
    let found = null;
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.code && data.code.toUpperCase() === searchCode) {
        found = { id: docSnap.id, ...data };
      }
    });

    if (!found) {
      resultBox.className = "check-terminal-output output-rejected";
      resultBox.innerHTML = `<strong>CÓDIGO NO LOCALIZADO (${searchCode})</strong><br>Verifica si está bien escrito o escríbenos directamente a WhatsApp.`;
      return;
    }

    if (found.status === "Aprobada") {
      resultBox.className = "check-terminal-output output-approved";
      resultBox.innerHTML = `
        <strong style="color:#22c55e;">[✓] ESTADO: VISITA CONFIRMADA</strong><br>
        Hola <strong>${found.name}</strong>, el servicio técnico para <strong>${found.service}</strong> fue <strong>aprobado</strong> para el <strong>${found.date}</strong> (${found.time}) en ${found.address}.
      `;
    } else if (found.status === "Rechazada") {
      resultBox.className = "check-terminal-output output-rejected";
      resultBox.innerHTML = `
        <strong style="color:#ef4444;">[✕] ESTADO: FECHA NO DISPONIBLE</strong><br>
        Hola <strong>${found.name}</strong>, no disponemos de cupo en la franja solicitada. Por favor escríbenos a WhatsApp para coordinar otra fecha.
      `;
    } else {
      resultBox.className = "check-terminal-output output-pending";
      resultBox.innerHTML = `
        <strong style="color:#eab308;">[⏳] ESTADO: PENDIENTE DE REVISIÓN</strong><br>
        Hola <strong>${found.name}</strong>, tu orden <strong>${found.code}</strong> se encuentra en análisis. Si aún no transmitiste la orden por WhatsApp, hazlo para agilizar la respuesta.
      `;
    }
  } catch (error) {
    resultBox.className = "check-terminal-output output-rejected";
    resultBox.innerHTML = "Error de enlace: " + error.message;
  }
};

// Panel de Administración (admin.html)
window.initAdminPage = function() {
  const isLogged = sessionStorage.getItem("refripro_admin_logged");
  const loginBox = document.getElementById("adminLoginBox");
  const dashBox = document.getElementById("adminDashboardBox");
  if (!loginBox || !dashBox) return;

  if (isLogged === "true") {
    loginBox.style.display = "none";
    dashBox.style.display = "block";
    subscribeToBookingsRealtime();
  } else {
    loginBox.style.display = "block";
    dashBox.style.display = "none";
  }
};

window.handleAdminLogin = function(event) {
  event.preventDefault();
  const u = document.getElementById("adminUser").value.trim();
  const p = document.getElementById("adminPass").value.trim();
  if (u === "jhonny" && p === "1208") {
    sessionStorage.setItem("refripro_admin_logged", "true");
    document.getElementById("adminLoginError").style.display = "none";
    window.initAdminPage();
  } else {
    document.getElementById("adminLoginError").style.display = "block";
  }
};

window.logoutAdmin = function() {
  sessionStorage.removeItem("refripro_admin_logged");
  window.initAdminPage();
};

function subscribeToBookingsRealtime() {
  const q = query(bookingsCol, orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    const bookings = [];
    snapshot.forEach(docSnap => {
      bookings.push({ docId: docSnap.id, ...docSnap.data() });
    });
    renderAdminDashboard(bookings);
  });
}

window.setBookingStatus = async function(docId, newStatus) {
  try {
    const bookingRef = doc(db, "reservas", docId);
    await updateDoc(bookingRef, { status: newStatus });
  } catch (e) {
    alert("Error al actualizar estado: " + e.message);
  }
};

window.deleteBooking = async function(docId) {
  if (confirm("¿Deseas purgar permanentemente esta orden del sistema?")) {
    try {
      const bookingRef = doc(db, "reservas", docId);
      await deleteDoc(bookingRef);
    } catch (e) {
      alert("Error al eliminar: " + e.message);
    }
  }
};

function renderAdminDashboard(bookings) {
  const list = document.getElementById("adminReservationsList");
  if (!list) return;

  const total = bookings.length;
  const approved = bookings.filter(b => b.status === "Aprobada").length;
  const pending = bookings.filter(b => b.status === "Pendiente").length;
  const rejected = bookings.filter(b => b.status === "Rechazada").length;

  document.getElementById("countTotal").textContent = total;
  document.getElementById("countApproved").textContent = approved;
  document.getElementById("countPending").textContent = pending;
  document.getElementById("countRejected").textContent = rejected;

  if (bookings.length === 0) {
    list.innerHTML = `<p style="text-align:center; color:#94a3b8; padding:40px 0;">No hay solicitudes registradas.</p>`;
    return;
  }

  let html = "";
  bookings.forEach(b => {
    const statusClass = b.status === "Aprobada" ? "is-approved" : (b.status === "Rechazada" ? "is-rejected" : "is-pending");
    const statusColor = b.status === "Aprobada" ? "#15803d" : (b.status === "Rechazada" ? "#b91c1c" : "#854d0e");

    html += `
      <div class="admin-res-card ${statusClass}">
        <div class="res-card-top">
          <span class="res-code-pill">${b.code}</span>
          <strong style="color: ${statusColor}; font-size: 0.9rem;">Estado: ${b.status}</strong>
        </div>
        <div class="res-data-grid">
          <div><strong>Cliente:</strong> ${b.name}</div>
          <div><strong>Teléfono:</strong> <a href="https://wa.me/${(b.phone || '').replace(/[^0-9]/g, '')}" target="_blank" style="color:var(--primary); font-weight:700;">${b.phone}</a></div>
          <div><strong>Dirección:</strong> ${b.address}</div>
          <div><strong>Servicio:</strong> ${b.service}</div>
          <div><strong>Fecha:</strong> ${b.date}</div>
          <div><strong>Franja:</strong> ${b.time}</div>
        </div>
        <div class="res-actions-bar">
          <div style="display:flex; gap:8px;">
            <button class="btn-status-action btn-approve" onclick="setBookingStatus('${b.docId}', 'Aprobada')">✓ Aprobar</button>
            <button class="btn-status-action btn-reject" onclick="setBookingStatus('${b.docId}', 'Rechazada')">✕ Rechazar</button>
            <button class="btn-status-action" style="background:#f1f5f9; border:1px solid #cbd5e1;" onclick="setBookingStatus('${b.docId}', 'Pendiente')">⏳ Pendiente</button>
          </div>
          <button class="btn-delete-res" onclick="deleteBooking('${b.docId}')">Eliminar</button>
        </div>
      </div>
    `;
  });

  list.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("adminLoginBox")) {
    window.initAdminPage();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-backdrop.active").forEach(modal => modal.classList.remove("active"));
    document.body.style.overflow = "auto";
  }
});
