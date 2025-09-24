async function fetchAndRender() {
    const res = await fetch("/data");
    const data = await res.json();
    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = "";

    data.forEach((item, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td>${item.model}</td>
      <td>${item.year}</td>
      <td>${item.mpg}</td>
      <td>${item.age}</td>
      <td><button class="delete-btn" data-index="${i}">✕</button></td>
    `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll(".delete-btn").forEach(btn =>
        btn.addEventListener("click", async () => {
            const idx = btn.dataset.index;
            await fetch("/delete", {
                method: "POST",
                body: JSON.stringify({ index: parseInt(idx) })
            });
            fetchAndRender();
        })
    );
}

window.onload = function() {
    fetchAndRender();
    document.getElementById("addForm").addEventListener("submit", async e => {
        e.preventDefault();
        const model = document.getElementById("model").value;
        const year  = document.getElementById("year").value;
        const mpg   = document.getElementById("mpg").value;

        await fetch("/add", {
            method: "POST",
            body: JSON.stringify({ model, year, mpg })
        });

        e.target.reset();
        fetchAndRender();
    });
};
