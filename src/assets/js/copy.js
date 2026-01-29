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
            // Get translation function (fallback to English if not available)
            const t = window.__lotteryTranslate || ((key) => {
                const fallbacks = {
                    'common.copied': 'COPIED!',
                    'common.copyAmount': 'COPY AMOUNT',
                    'common.copyWallet': 'COPY WALLET',
                    'common.error.copyFailed': 'Copy failed'
                };
                return fallbacks[key] || key;
            });

            navigator.clipboard
                .writeText(textToCopy)
                .then(() => {
                    button.classList.add("copied");
                    button.querySelector("span").textContent = t('common.copied');
                    setTimeout(() => {
                        button.classList.remove("copied");
                        button.querySelector("span").textContent =
                            targetId === "copyAmount" ? t('common.copyAmount') : t('common.copyWallet');
                    }, 1500);
                })
                .catch(() => {
                    alert(t('common.error.copyFailed'));
                });
        }
    });
});
