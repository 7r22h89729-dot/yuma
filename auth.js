document.addEventListener("DOMContentLoaded", () => {
  const lockScreen = document.getElementById("lock-screen");
  const homeScreen = document.getElementById("home-screen");
  const const passcodeDisplay = document.getElementById("pass-dots");passcodeDisplay = document.getElementById("passcode-display");
  if (!lockScreen || !homeScreen || !passcodeDisplay || !keypad) {
    console.error("잠금 화면 요소를 찾을 수 없습니다.");
    return;
  }
  let enteredCode = "";
  const correctCode = "0207";
  keypad.innerHTML = "";
  for (let i = 1; i <= 9; i++) {
    createButton(String(i));
  }
  createButton("");
  createButton("0");
  createButton("⌫");
  function createButton(value) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "keypad-button";
    button.textContent = value;
    if (value === "") {
      button.disabled = true;
    } else {
      button.addEventListener("click", () => {
        if (value === "⌫") {
          enteredCode = enteredCode.slice(0, -1);
        } else if (enteredCode.length < 4) {
          enteredCode += value;
        }
        updateDisplay();
        if (enteredCode.length === 4) {
          if (enteredCode === correctCode) {
            lockScreen.classList.add("hidden");
            homeScreen.classList.remove("hidden");
          } else {
            setTimeout(() => {
              enteredCode = "";
              updateDisplay();
            }, 500);
          }
        }
      });
    }
    keypad.appendChild(button);
  }
  function updateDisplay() {
    passcodeDisplay.textContent =
      "● ".repeat(enteredCode.length).trim();
  }
});
