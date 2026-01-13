const langButton = document.querySelector(".header__lang-button");
const settButton = document.querySelector(".header__settings-button");
const heroContainer = document.querySelector(".swiper");
const statsContainer = document.querySelector(".stats__container");

window.openModal = function (name) {
    document.body.style.overflow = "hidden";
    const modal = document.querySelector(`.layout[data-modal="${name}"]`);
    if (modal) modal.classList.add("active");
    if (langButton && name === "langModal") langButton.style.zIndex = 101;
    if (settButton && name === "headerMenu") settButton.style.zIndex = 101;
    if (heroContainer && name === "tutorialModalOne") heroContainer.style.zIndex = 101;
    if (statsContainer && name === "tutorialModalTwo") statsContainer.style.zIndex = 101;
    if (statsContainer && name === "tutorialModalThree") statsContainer.style.zIndex = 101;
};

window.closeModal = function (name) {
    document.body.style.overflow = "auto";
    const modal = document.querySelector(`.layout[data-modal="${name}"]`);
    if (modal) modal.classList.remove("active");
    if (langButton) {
        langButton.style.zIndex = 1;
    }
    if (settButton && name === "headerMenu") settButton.style.zIndex = 1;
    if (heroContainer && name === "tutorialModalOne") heroContainer.style.zIndex = 1;
    if (statsContainer && name === "tutorialModalTwo") statsContainer.style.zIndex = 1;
    if (statsContainer && name === "tutorialModalThree") statsContainer.style.zIndex = 1;
};

window.switchModal = function (fromModal, toModal) {
    closeModal(fromModal);
    openModal(toModal);
};

document.addEventListener("click", (e) => {
    // Закрыть при клике по кнопке или по фону
    if (
        e.target.matches("[data-close]") ||
        e.target.classList.contains("layout") ||
        e.target.classList.contains("modal__overlay")
    ) {
        document.body.style.overflow = "auto";
        const modal = e.target.closest(".layout");
        if (modal) modal.classList.remove("active");
        if (langButton) langButton.style.zIndex = 1;
        if (settButton) settButton.style.zIndex = 1;
        if (heroContainer) heroContainer.style.zIndex = 1;
        if (statsContainer) statsContainer.style.zIndex = 1;
    }
});

