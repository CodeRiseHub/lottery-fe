let miningInterval = null;
let startTime = null;

function formatTime(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
}

document.getElementById("startButton").addEventListener("click", () => {
    if (miningInterval) return;

    startTime = Date.now();
    const icon = document.querySelector(".hero__button-icon");
    const buttonText = document.getElementById("buttonText");

    miningInterval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        buttonText.textContent = formatTime(elapsedSeconds);
        icon.style.display = "none";
    }, 1000);
});
