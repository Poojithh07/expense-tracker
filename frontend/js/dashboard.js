const welcomeMessage = document.getElementById("welcomeMessage");
const message = document.getElementById("message");
const expensesTableBody = document.getElementById("expensesTableBody");
const logoutButton = document.getElementById("logoutButton");
const expenseForm = document.getElementById("expenseForm");
const expenseFormMessage = document.getElementById("expenseFormMessage");
const expenseSubmitButton = document.getElementById("expenseSubmitButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const totalSpending = document.getElementById("totalSpending");
const categorySummary = document.getElementById("categorySummary");
const monthlySummary = document.getElementById("monthlySummary");

let editingExpenseId = null;
const categoryChartCanvas = document.getElementById("categoryChart");

let categoryChart = null;
const monthlyChartCanvas = document.getElementById("monthlyChart");

let monthlyChart = null;
async function loadCurrentUser() {
    const response = await fetch("/api/auth/me");

    if (!response.ok) {
        window.location.href = "/login";
        return null;
    }

    const data = await response.json();

    welcomeMessage.textContent = `Welcome, ${data.user.username}`;

    return data.user;
}

async function loadExpenses() {
    try {
        const response = await fetch("/api/expenses");

        if (!response.ok) {
            message.textContent = "Unable to load expenses.";
            return;
        }

        const expenses = await response.json();

        expensesTableBody.innerHTML = "";

        expenses.forEach((expense) => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${formatExpenseDate(expense.date)}</td>
                <td>${expense.category}</td>
                <td>${expense.description || ""}</td>
                <td>${formatExpenseAmount(expense.amount)}</td>
             <td>
    <button type="button" class="edit-button" data-id="${expense.id}">
        Edit
    </button>

    <button type="button" class="delete-button" data-id="${expense.id}">
        Delete
    </button>
</td>
            `;

            expensesTableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading expenses:", error);
        message.textContent = "Unable to connect to server.";
        showDashboardMessage("Unable to load expenses.", "error");
    }
}

async function logout() {
    try {
        const response = await fetch("/api/auth/logout", {
            method: "POST",
        });

        if (response.ok) {
            window.location.href = "/login";
        }
    } catch (error) {
        console.error("Logout error:", error);
    }
}

logoutButton.addEventListener("click", logout);

async function initializeDashboard() {
    const user = await loadCurrentUser();

    if (!user) {
        return;
    }

    await loadExpenses();
    await loadTotalSpending();
    await loadCategorySummary();
     await loadMonthlySummary();
}
async function saveExpense(event) {
    event.preventDefault();

    const amount = document.getElementById("amount").value;
    const category = document.getElementById("category").value;
    const description = document.getElementById("description").value;
    const date = document.getElementById("date").value;

    const validationError = validateExpenseForm(
    amount,
    category,
    date
);

if (validationError) {
    expenseFormMessage.textContent = validationError;
    return;
}
    const isEditing = editingExpenseId !== null;
    const url = isEditing
        ? `/api/expenses/${editingExpenseId}`
        : "/api/expenses";

    const method = isEditing ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                amount,
                category,
                description,
                date,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            expenseFormMessage.textContent = data.error;
            return;
        }

        expenseFormMessage.textContent = isEditing
            ? "Expense updated successfully."
            : "Expense added successfully.";

        resetExpenseForm();

        await loadExpenses();
        await loadTotalSpending();
        await loadCategorySummary();
         await loadMonthlySummary();
    } catch (error) {
        console.error("Error saving expense:", error);
        expenseFormMessage.textContent = "Unable to connect to server.";
        showDashboardMessage("Unable to save expense.", "error");
    }
}
async function deleteExpense(expenseId) {
    const confirmed = window.confirm(
        "Are you sure you want to delete this expense?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/expenses/${expenseId}`, {
            method: "DELETE",
        });

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.error;
            return;
        }

        message.textContent = "Expense deleted successfully.";

        await loadExpenses();
        await loadTotalSpending();
        await loadCategorySummary();
         await loadMonthlySummary();
    } catch (error) {
        console.error("Error deleting expense:", error);
        message.textContent = "Unable to connect to server.";
        showDashboardMessage("Unable to delete expense.", "error");
    }
}
expensesTableBody.addEventListener("click", (event) => {
    if (event.target.classList.contains("edit-button")) {
        const expenseId = event.target.dataset.id;

        startEditingExpense(expenseId);
        return;
    }

    if (event.target.classList.contains("delete-button")) {
        const expenseId = event.target.dataset.id;

        deleteExpense(expenseId);
    }
});
async function startEditingExpense(expenseId) {
    try {
        const response = await fetch(`/api/expenses/${expenseId}`);

        if (!response.ok) {
            message.textContent = "Unable to load expense.";
            return;
        }

        const expense = await response.json();

        document.getElementById("amount").value = expense.amount;
        document.getElementById("category").value = expense.category;
        document.getElementById("description").value = expense.description || "";

        const expenseDate = expense.date.split("T")[0];
        document.getElementById("date").value = expenseDate;

        editingExpenseId = expense.id;

        expenseSubmitButton.textContent = "Update Expense";
        cancelEditButton.hidden = false;

        document.getElementById("amount").focus();
    } catch (error) {
        console.error("Error loading expense:", error);
        message.textContent = "Unable to connect to server.";
    }
}
function resetExpenseForm() {
    expenseForm.reset();

    editingExpenseId = null;

    expenseSubmitButton.textContent = "Add Expense";
    cancelEditButton.hidden = true;
}
function formatExpenseDate(dateValue) {
    return new Date(dateValue).toLocaleDateString();
}
function formatExpenseAmount(amount) {
    return Number(amount).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
    });
}
async function loadTotalSpending() {
    try {
        const response = await fetch("/api/expenses/summary/total");

        if (!response.ok) {
            totalSpending.textContent = "Unable to load";
            return;
        }

        const data = await response.json();

        totalSpending.textContent = Number(data.total).toLocaleString(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
            }
        );
    } catch (error) {
        console.error("Error loading total spending:", error);
        totalSpending.textContent = "Unable to load";
    }
}
async function loadCategorySummary() {
    try {
        const response = await fetch("/api/expenses/summary/category");

        if (!response.ok) {
            categorySummary.innerHTML = "<li>Unable to load summary.</li>";
            return;
        }

        const categories = await response.json();
        renderCategoryChart(categories);
        categorySummary.innerHTML = "";

        if (categories.length === 0) {
            categorySummary.innerHTML = "<li>No expenses yet.</li>";
            return;
        }

        categories.forEach((item) => {
            const listItem = document.createElement("li");

            const amount = Number(item.total).toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
            });

            listItem.textContent = `${item.category} — ${amount}`;

            categorySummary.appendChild(listItem);
        });
    } catch (error) {
        console.error("Error loading category summary:", error);
        categorySummary.innerHTML = "<li>Unable to load summary.</li>";
        showDashboardMessage("Unable to load category summary.");
    }
}
async function loadMonthlySummary() {
    try {
        const response = await fetch("/api/expenses/summary/month");

        if (!response.ok) {
            monthlySummary.innerHTML = "<li>Unable to load summary.</li>";
            return;
        }

        const months = await response.json();
        renderMonthlyChart(months);

        monthlySummary.innerHTML = "";

        if (months.length === 0) {
            monthlySummary.innerHTML = "<li>No expenses yet.</li>";
            return;
        }

        months.forEach((item) => {
            const listItem = document.createElement("li");

            const amount = Number(item.total).toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
            });

            listItem.textContent = `${item.month} — ${amount}`;

            monthlySummary.appendChild(listItem);
        });
    } catch (error) {
        console.error("Error loading monthly summary:", error);
        monthlySummary.innerHTML = "<li>Unable to load summary.</li>";
        showDashboardMessage("Unable to load monthly summary.");
    }
}
function renderCategoryChart(categories) {
    const labels = categories.map((item) => item.category);
    const values = categories.map((item) => Number(item.total));

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(categoryChartCanvas, {
        type: "pie",
        data: {
            labels,
            datasets: [
                {
                    data: values,
                },
            ],
        },
        options: {
            responsive: true,
              maintainAspectRatio: false,   
        },
    });
}
function renderMonthlyChart(months) {
    const labels = months.map((item) => item.month);
    const values = months.map((item) => Number(item.total));

    if (monthlyChart) {
        monthlyChart.destroy();
    }

    monthlyChart = new Chart(monthlyChartCanvas, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Monthly Spending",
                    data: values,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
        },
    });
}
function validateExpenseForm(amount, category, date) {
    const numericAmount = Number(amount);

    if (!amount) {
        return "Amount is required.";
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return "Amount must be greater than 0.";
    }

    if (!category.trim()) {
        return "Category is required.";
    }

    if (!date) {
        return "Date is required.";
    }

    return null;
}
function showDashboardMessage(message, type = "error") {
    if (!expenseFormMessage) {
        return;
    }

    expenseFormMessage.textContent = message;
    expenseFormMessage.dataset.type = type;
}
cancelEditButton.addEventListener("click", resetExpenseForm);
expenseForm.addEventListener("submit", saveExpense);
initializeDashboard();