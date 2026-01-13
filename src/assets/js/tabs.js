document.querySelectorAll("[data-tabs]").forEach((tabsBlock) => {
    const nav = tabsBlock.querySelector("[data-tabs-nav]");
    const tabButtons = nav.querySelectorAll("[data-tab-target]");
    const tabContents = tabsBlock.querySelectorAll("[data-tab-content]");
    const activeBg = nav.querySelector(".tabs__active-position");
    const activeBgSecond = nav.querySelector(".tabs__active-position-second");

    tabButtons.forEach((button, index) => {
        button.addEventListener("click", () => {
            const target = button.getAttribute("data-tab-target");

            // Переключение активного класса
            tabButtons.forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");

            // Скрыть/показать контент
            tabContents.forEach((content) => {
                const name = content.getAttribute("data-tab-content");
                content.hidden = name !== target;
            });

            // Двигаем подложку
            const tabCount = tabButtons.length;
            if (activeBgSecond) {
                const offset = index * (200 / tabCount);
                activeBg.style.transform = `translateX(${offset}%)`;
            } else {
                const offset = index * (300 / tabCount);
                activeBg.style.transform = `translateX(${offset}%)`;
            }
        });
    });

    // При загрузке сразу позиционируем фон
    const activeIndex = [...tabButtons].findIndex((btn) => btn.classList.contains("active"));
    if (activeIndex >= 0) {
        const tabCount = tabButtons.length;
        const offset = activeIndex * (100 / tabCount);
        activeBg.style.transform = `translateX(${offset}%)`;
    }
});
