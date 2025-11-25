document.addEventListener("DOMContentLoaded", () => {
    fetch("tabs.json")
        .then(response => response.json())
        .then(data => {
            const tabsContainer = document.getElementById("tabs");

            data.tabs
                .filter(tab => tab.visible)
                .forEach(tab => {
                    const tabElement = document.createElement("div");
                    tabElement.className = "tab";
                    tabElement.textContent = tab.name;
                    tabsContainer.appendChild(tabElement);
                });
        })
        .catch(error => console.error("Fehler beim Laden von tabs.json:", error));
});
