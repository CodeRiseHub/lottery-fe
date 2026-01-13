export function initTabs() {
    if (typeof window.$ === 'undefined') {
        console.warn('jQuery not loaded, tabs will not work');
        return;
    }

    window.$(document).ready(function() {
        window.$("[data-tabs]").each(function() {
            const tabsBlock = window.$(this);
            const nav = tabsBlock.find("[data-tabs-nav]");
            const tabButtons = nav.find("[data-tab-target]");
            const tabContents = tabsBlock.find("[data-tab-content]");
            const activeBg = nav.find(".tabs__active-position");
            const activeBgSecond = nav.find(".tabs__active-position-second");

            tabButtons.each(function(index) {
                window.$(this).on("click", function() {
                    const target = window.$(this).attr("data-tab-target");

                    // Переключение активного класса
                    tabButtons.removeClass("active");
                    window.$(this).addClass("active");

                    // Скрыть/показать контент
                    tabContents.each(function() {
                        const name = window.$(this).attr("data-tab-content");
                        window.$(this).prop("hidden", name !== target);
                    });

                    // Двигаем подложку
                    const tabCount = tabButtons.length;
                    if (activeBgSecond.length) {
                        const offset = index * (200 / tabCount);
                        activeBg.css("transform", `translateX(${offset}%)`);
                    } else {
                        const offset = index * (300 / tabCount);
                        activeBg.css("transform", `translateX(${offset}%)`);
                    }
                });
            });

            // При загрузке сразу позиционируем фон
            const activeIndex = tabButtons.toArray().findIndex(btn => window.$(btn).hasClass("active"));
            if (activeIndex >= 0) {
                const tabCount = tabButtons.length;
                const offset = activeIndex * (100 / tabCount);
                activeBg.css("transform", `translateX(${offset}%)`);
            }
        });
    });
}

