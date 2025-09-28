const savedPassword = localStorage.getItem("appPassword");

function checkPassword() {
  const input = document.getElementById("password-input").value;
  if (!savedPassword) {
    localStorage.setItem("appPassword", input);
    showApp();
  } else if (input === savedPassword) {
    showApp();
  } else {
    alert("Falsches Passwort!");
  }
}

function showApp() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "block";
  loadData();
}

function addStunde() {
  const input = document.getElementById("stunden-eingabe");
  const list = document.getElementById("stunden-liste");
  const value = input.value.trim();
  if (!value) return;
  const li = document.createElement("li");
  li.textContent = value;
  list.appendChild(li);
  input.value = "";
  saveStunden();
}

function saveStunden() {
  const items = [...document.querySelectorAll("#stunden-liste li")].map(li => li.textContent);
  localStorage.setItem("stundenplan", JSON.stringify(items));
}

function loadStunden() {
  const list = document.getElementById("stunden-liste");
  const data = JSON.parse(localStorage.getItem("stundenplan") || "[]");
  data.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
}

function addTodo() {
  const input = document.getElementById("todo-eingabe");
  const list = document.getElementById("todo-liste");
  const value = input.value.trim();
  if (!value) return;
  const li = document.createElement("li");
  li.textContent = value;
  li.onclick = () => {
    li.style.textDecoration = li.style.textDecoration === "line-through" ? "" : "line-through";
    saveTodo();
  };
  list.appendChild(li);
  input.value = "";
  saveTodo();
}

function saveTodo() {
  const items = [...document.querySelectorAll("#todo-liste li")].map(li => ({
    text: li.textContent,
    done: li.style.textDecoration === "line-through"
  }));
  localStorage.setItem("todos", JSON.stringify(items));
}

function loadTodo() {
  const list = document.getElementById("todo-liste");
  const data = JSON.parse(localStorage.getItem("todos") || "[]");
  data.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item.text;
    if (item.done) li.style.textDecoration = "line-through";
    li.onclick = () => {
      li.style.textDecoration = li.style.textDecoration === "line-through" ? "" : "line-through";
      saveTodo();
    };
    list.appendChild(li);
  });
}

function addVokabel() {
  const frage = document.getElementById("frage").value.trim();
  const antwort = document.getElementById("antwort").value.trim();
  if (!frage || !antwort) return;
  const div = document.createElement("div");
  div.className = "vokabel";
  div.innerHTML = `<strong>${frage}</strong><br>${antwort}`;
  document.getElementById("vokabel-liste").appendChild(div);
  document.getElementById("frage").value = "";
  document.getElementById("antwort").value = "";
  saveVokabeln();
}

function saveVokabeln() {
  const vokabeln = [...document.querySelectorAll(".vokabel")].map(div => {
    const [frage, antwort] = div.innerText.split("\n");
    return { frage, antwort };
  });
  localStorage.setItem("vokabeln", JSON.stringify(vokabeln));
}

function loadVokabeln() {
  const list = document.getElementById("vokabel-liste");
  const data = JSON.parse(localStorage.getItem("vokabeln") || "[]");
  data.forEach(k => {
    const div = document.createElement("div");
    div.className = "vokabel";
    div.innerHTML = `<strong>${k.frage}</strong><br>${k.antwort}`;
    list.appendChild(div);
  });
}

function loadData() {
  loadStunden();
  loadTodo();
  loadVokabeln();
}

// Bildschirm teilen – WebRTC mit WebSocket
let socket, peer;
function verbinde() {
  const rolle = document.getElementById("rolle").value;
  const code = document.getElementById("code").value;
  socket = new WebSocket("wss://DEIN-WEBSOCKET-SERVER:3000");

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: "register", role: rolle, code }));
    if (rolle === "schueler") startScreenShare(code);
  };

  socket.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "signal") {
      if (msg.data.sdp) {
        await peer.setRemoteDescription(new RTCSessionDescription(msg.data.sdp));
        if (msg.data.sdp.type === "offer") {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.send(JSON.stringify({ type: "signal", target: "lehrer-" + code, from: "schueler-" + code, data: { sdp: peer.localDescription } }));
        }
      } else if (msg.data.candidate) {
        await peer.addIceCandidate(new RTCIceCandidate(msg.data.candidate));
      }
    }
  };
}

async function startScreenShare(code) {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  peer = new RTCPeerConnection();
  stream.getTracks().forEach(track => peer.addTrack(track, stream));
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.send(JSON.stringify({ type: "signal", target: "lehrer-" + code, from: "schueler-" + code, data:
