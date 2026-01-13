function copyReferralLink() {
    const textElement = document.getElementById("refLink");
    const text = textElement.textContent.trim();

    navigator.clipboard.writeText(text);
}

document.querySelectorAll(".upgrade-pay__copy-button").forEach((button) => {
    button.addEventListener("click", () => {
        const targetId = button.getAttribute("data-copy-target");
        const textToCopy = document.getElementById(targetId)?.textContent.trim();

        if (textToCopy) {
            navigator.clipboard
                .writeText(textToCopy)
                .then(() => {
                    // Можно показать временное сообщение или изменить текст
                    button.classList.add("copied");
                    button.querySelector("span").textContent = "COPIED!";
                    setTimeout(() => {
                        button.classList.remove("copied");
                        button.querySelector("span").textContent =
                            targetId === "copyAmount" ? "COPY AMOUNT" : "COPY WALLET";
                    }, 1500);
                })
                .catch(() => {
                    alert("Copy failed");
                });
        }
    });
});
