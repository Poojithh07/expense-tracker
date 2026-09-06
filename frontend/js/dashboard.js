const state = {
    expenses: [],
    monthlyChart: null,
    categoryChart: null,
    editingExpenseId: null,
};

const elements = {
    sidebar: document.getElementById("sidebar"),
    sidebarOverlay: document.getElementById("sidebarOverlay"),
    sidebarClose: document.getElementById("sidebarClose"),
    menuButton: document.getElementById("menuButton"),

    sidebarAvatar: document.getElementById("sidebarAvatar"),
    sidebarNickname: document.getElementById("sidebarNickname"),
    sidebarUsername: document.getElementById("sidebarUsername"),

    topbarAvatar: document.getElementById("topbarAvatar"),
    topbarNickname: document.getElementById("topbarNickname"),

    welcomeHeading: document.getElementById("welcomeHeading"),

    totalSpending: document.getElementById("totalSpending"),
    transactionCount: document.getElementById("transactionCount"),
    topCategory: document.getElementById("topCategory"),
    expenseSearch: document.getElementById("expenseSearch"),
    expenseCategoryFilter: document.getElementById("categoryFilter"),
    clearExpenseFilters: document.getElementById(
    "clearExpenseFilters"
),
expenseResultsCount: document.getElementById(
    "expenseResultsCount"
),
    monthlyChart: document.getElementById("monthlyChart"),
    monthlyChartEmpty: document.getElementById("monthlyChartEmpty"),

    categoryChart: document.getElementById("categoryChart"),
    categoryChartEmpty: document.getElementById("categoryChartEmpty"),
    categoryList: document.getElementById("categoryList"),

    expenseTableBody: document.getElementById("expenseTableBody"),
    mobileExpenses: document.getElementById("mobileExpenses"),

    expenseModal: document.getElementById("expenseModal"),
    expenseModalTitle: document.getElementById("expenseModalTitle"),
    modalClose: document.getElementById("modalClose"),
    modalCancel: document.getElementById("modalCancel"),

    expenseForm: document.getElementById("expenseForm"),
    expenseId: document.getElementById("expenseId"),
    amount: document.getElementById("amount"),
    category: document.getElementById("category"),
    description: document.getElementById("description"),
    date: document.getElementById("date"),
    expenseMessage: document.getElementById("expenseMessage"),
    saveExpenseButton: document.getElementById("saveExpenseButton"),
    
    heroAddExpenseButton: document.getElementById(
        "heroAddExpenseButton"
    ),
    sectionAddExpenseButton: document.getElementById(
        "sectionAddExpenseButton"
    ),

    logoutButton: document.getElementById("logoutButton"),
};

function getInitials(name) {
    const normalizedName = String(name || "User").trim();

    if (!normalizedName) {
        return "U";
    }

    const words = normalizedName.split(/\s+/);

    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }

    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) {
        return "Good morning";
    }

    if (hour < 18) {
        return "Good afternoon";
    }

    return "Good evening";
}

function formatCurrency(amount) {
    const numericAmount = Number(amount) || 0;

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(numericAmount);
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "—";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
    }

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: "include",
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });

    const contentType = response.headers.get("content-type") || "";

    const data = contentType.includes("application/json")
        ? await response.json()
        : null;

    if (!response.ok) {
        throw new Error(
            data?.error || `Request failed with status ${response.status}`
        );
    }

    return data;
}

function setExpenseMessage(message, type = "error") {
    elements.expenseMessage.textContent = message;
    elements.expenseMessage.dataset.type = type;
}

function setProfile(user) {
    const nickname = user?.nickname || user?.username || "User";
    const username = user?.username || "username";
    const initials = getInitials(nickname);

    elements.sidebarNickname.textContent = nickname;
    elements.sidebarUsername.textContent = `@${username}`;

    elements.topbarNickname.textContent = nickname;

    elements.sidebarAvatar.textContent = initials;
    elements.topbarAvatar.textContent = initials;

    elements.welcomeHeading.textContent =
        `${getGreeting()}, ${nickname} 👋`;
}

async function loadCurrentUser() {
    try {
        const data = await apiRequest("/api/auth/me");

        setProfile(data.user || data);
    } catch (error) {
        console.error("Unable to load current user:", error);

        if (
            error.message.includes("401") ||
            error.message.toLowerCase().includes("unauthorized")
        ) {
            window.location.href = "login.html";
        }
    }
}

async function loadExpenses() {
    try {
        const data = await apiRequest("/api/expenses");

        state.expenses = Array.isArray(data)
            ? data
            : data.expenses || [];

        
        updateTransactionCount();
        populateCategoryFilter();
        applyExpenseFilters();
    } catch (error) {
        console.error("Unable to load expenses:", error);

        renderExpenseError(error.message);
    }
}

async function loadTotalSpending() {
    try {
        const data = await apiRequest(
            "/api/expenses/summary/total"
        );

        const total =
            data.total ??
            data.totalAmount ??
            data.amount ??
            0;

        elements.totalSpending.textContent = formatCurrency(total);
    } catch (error) {
        console.error("Unable to load total spending:", error);
    }
}

async function loadCategorySummary() {
    try {
        const data = await apiRequest(
            "/api/expenses/summary/category"
        );

        const categories = Array.isArray(data)
            ? data
            : data.categories || [];

        renderCategoryChart(categories);
        renderCategoryList(categories);
        updateTopCategory(categories);
    } catch (error) {
        console.error("Unable to load category summary:", error);

        renderCategoryChart([]);
        renderCategoryList([]);
    }
}

async function loadMonthlySummary() {
    try {
        const data = await apiRequest(
            "/api/expenses/summary/month"
        );

        const months = Array.isArray(data)
            ? data
            : data.months || [];

        renderMonthlyChart(months);
    } catch (error) {
        console.error("Unable to load monthly summary:", error);

        renderMonthlyChart([]);
    }
}

function updateTransactionCount() {
    elements.transactionCount.textContent = state.expenses.length;
}

function updateTopCategory(categories) {
    if (!categories.length) {
        elements.topCategory.textContent = "—";
        return;
    }

    const first = [...categories].sort(
        (a, b) =>
            Number(
                b.total ??
                b.amount ??
                b.totalAmount ??
                b.sum ??
                0
            ) -
            Number(
                a.total ??
                a.amount ??
                a.totalAmount ??
                a.sum ??
                0
            )
    )[0];

    elements.topCategory.textContent =
        first.category ||
        first.name ||
        first.label ||
        "—";
}

function getCategoryValue(item) {
    return Number(
        item.total ??
        item.amount ??
        item.totalAmount ??
        item.total_spending ??
        item.totalSpent ??
        item.sum ??
        0
    );
}

function getMonthLabel(item) {
    return (
        item.month ||
        item.label ||
        item.date ||
        item.month_name ||
        item.monthName ||
        "Unknown"
    );
}

function renderMonthlyChart(months) {
    if (!window.Chart || !elements.monthlyChart) {
        return;
    }
     const sortedMonths = [...months].sort((a, b) => {
        const first = String(getMonthLabel(a));
        const second = String(getMonthLabel(b));

        return first.localeCompare(second);
    });


    const labels = sortedMonths.map(getMonthLabel);
const values = sortedMonths.map(getCategoryValue);

elements.monthlyChartEmpty.hidden = sortedMonths.length > 0;

    state.monthlyChart?.destroy();

    if (!sortedMonths.length) {
        return;
    }

    state.monthlyChart = new Chart(elements.monthlyChart, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    data: values,
                    tension: 0.35,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return formatCurrency(context.raw);
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                    },
                    ticks: {
                        color: "#737b8f",
                        font: {
                            size: 10,
                        },
                    },
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: "rgba(115, 123, 143, 0.1)",
                    },
                    ticks: {
                        color: "#737b8f",
                        font: {
                            size: 10,
                        },
                        callback(value) {
                            return formatCurrency(value);
                        },
                    },
                },
            },
        },
    });
}

function renderCategoryChart(categories) {
    if (!window.Chart || !elements.categoryChart) {
        return;
    }

    const labels = categories.map(
        (item) =>
            item.category ||
            item.name ||
            item.label ||
            "Other"
    );

const values = categories.map(getCategoryValue);

const hasCategoryValues = values.some(
    (value) => value > 0
);

elements.categoryChartEmpty.hidden = hasCategoryValues;
    

    state.categoryChart?.destroy();

    if (!categories.length) {
        return;
    }

    state.categoryChart = new Chart(elements.categoryChart, {
        type: "doughnut",
        data: {
            labels,
            datasets: [
                {
                    data: values,
                    borderWidth: 0,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return `${context.label}: ${formatCurrency(
                                context.raw
                            )}`;
                        },
                    },
                },
            },
        },
    });
}
function filterExpenses(expenses, searchTerm) {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
        return expenses;
    }

    return expenses.filter((expense) => {
        const category = String(expense.category || "").toLowerCase();
        const description = String(
            expense.description || ""
        ).toLowerCase();

        return (
            category.includes(normalizedSearch) ||
            description.includes(normalizedSearch)
        );
    });
}
function renderCategoryList(categories) {
    if (!categories.length) {
        elements.categoryList.innerHTML = "";
        return;
    }

    const sortedCategories = [...categories].sort(
        (a, b) => getCategoryValue(b) - getCategoryValue(a)
    );

    elements.categoryList.innerHTML = sortedCategories
        .slice(0, 5)
        .map((item) => {
            const name =
                item.category ||
                item.name ||
                item.label ||
                "Other";

            return `
                <div class="category-item">
                    <div class="category-item-label">
                        <span class="category-dot"></span>
                        <span>${escapeHtml(name)}</span>
                    </div>

                    <strong>
                        ${formatCurrency(getCategoryValue(item))}
                    </strong>
                </div>
            `;
        })
        .join("");
}
function populateCategoryFilter() {
    const categories = [
        ...new Set(
            state.expenses
                .map((expense) =>
                    String(expense.category || "").trim()
                )
                .filter(Boolean)
        ),
    ].sort((first, second) =>
        first.localeCompare(second)
    );

    const currentValue =
        elements.expenseCategoryFilter.value;

    elements.expenseCategoryFilter.innerHTML = `
        <option value="">All categories</option>
        ${categories
            .map(
                (category) =>
                    `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
            )
            .join("")}
    `;

    if (categories.includes(currentValue)) {
        elements.expenseCategoryFilter.value =
            currentValue;
    }
}
function renderExpenses(expenses = state.expenses) {
    if (!expenses.length) {
        elements.expenseTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="table-state">
                    No expenses match your filters.
                </td>
            </tr>
        `;

        elements.mobileExpenses.innerHTML = `
            <div class="mobile-expense-card">
                <div class="table-state">
                    No expenses match your filters.
                </div>
            </div>
        `;

        return;
    }

    elements.expenseTableBody.innerHTML = expenses
        .map(renderExpenseRow)
        .join("");

    elements.mobileExpenses.innerHTML = expenses
        .map(renderMobileExpense)
        .join("");
}

function renderExpenseRow(expense) {
    const id = escapeHtml(expense.id);
    const category = escapeHtml(expense.category);
    const description = escapeHtml(
        expense.description || "No description"
    );

    return `
        <tr>
            <td>${escapeHtml(formatDate(expense.date))}</td>

            <td>
                <span class="expense-category">
                    ${category}
                </span>
            </td>

            <td>${description}</td>

            <td class="expense-amount">
                ${formatCurrency(expense.amount)}
            </td>

            <td>
                <div class="expense-actions">
                    <button
                        type="button"
                        class="action-button"
                        data-action="edit"
                        data-id="${id}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="action-button delete"
                        data-action="delete"
                        data-id="${id}"
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function renderMobileExpense(expense) {
    const id = escapeHtml(expense.id);
    const category = escapeHtml(expense.category);
    const description = escapeHtml(
        expense.description || "No description"
    );

    return `
        <article class="mobile-expense-card">
            <div class="mobile-expense-top">
                <span class="expense-category">
                    ${category}
                </span>

                <span class="mobile-expense-date">
                    ${escapeHtml(formatDate(expense.date))}
                </span>
            </div>

            <p class="mobile-expense-description">
                ${description}
            </p>

            <div class="mobile-expense-bottom">
                <strong class="mobile-expense-amount">
                    ${formatCurrency(expense.amount)}
                </strong>

                <div class="expense-actions">
                    <button
                        type="button"
                        class="action-button"
                        data-action="edit"
                        data-id="${id}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="action-button delete"
                        data-action="delete"
                        data-id="${id}"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </article>
    `;
}

function renderExpenseError(message) {
    elements.expenseTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="table-state">
                Unable to load expenses: ${escapeHtml(message)}
            </td>
        </tr>
    `;

    elements.mobileExpenses.innerHTML = `
        <div class="mobile-expense-card">
            <div class="table-state">
                Unable to load expenses.
            </div>
        </div>
    `;
}

function openSidebar() {
    elements.sidebar.classList.add("is-open");
    elements.sidebarOverlay.classList.add("is-visible");
    elements.menuButton.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
    elements.sidebar.classList.remove("is-open");
    elements.sidebarOverlay.classList.remove("is-visible");
    elements.menuButton.setAttribute("aria-expanded", "false");
}

function openExpenseModal(expense = null) {
    elements.expenseForm.reset();
    setExpenseMessage("");

    state.editingExpenseId = expense?.id || null;

    elements.expenseId.value = expense?.id || "";
    elements.amount.value = expense?.amount || "";
    elements.category.value = expense?.category || "";
    elements.description.value = expense?.description || "";

    if (expense?.date) {
        elements.date.value = String(expense.date).slice(0, 10);
    } else {
        elements.date.value = new Date()
            .toISOString()
            .slice(0, 10);
    }

    elements.expenseModalTitle.textContent = expense
        ? "Edit expense"
        : "Add expense";

    elements.saveExpenseButton.textContent = expense
        ? "Update expense"
        : "Save expense";

    elements.expenseModal.hidden = false;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
        elements.amount.focus();
    });
}

function closeExpenseModal() {
    elements.expenseModal.hidden = true;
    document.body.style.overflow = "";
    state.editingExpenseId = null;
}

async function saveExpense(event) {
    event.preventDefault();

    setExpenseMessage("");

    const amount = Number(elements.amount.value);
    const category = elements.category.value.trim();
    const description = elements.description.value.trim();
    const date = elements.date.value;

    if (!Number.isFinite(amount) || amount <= 0) {
        setExpenseMessage(
            "Amount must be a positive number."
        );
        return;
    }

    if (!category) {
        setExpenseMessage("Category is required.");
        return;
    }

    if (category.length > 50) {
        setExpenseMessage(
            "Category must be 50 characters or fewer."
        );
        return;
    }

    if (description.length > 255) {
        setExpenseMessage(
            "Description must be 255 characters or fewer."
        );
        return;
    }

    if (!date || Number.isNaN(Date.parse(date))) {
        setExpenseMessage("A valid date is required.");
        return;
    }

    const expenseId = state.editingExpenseId;

    elements.saveExpenseButton.disabled = true;

    try {
        if (expenseId) {
            await apiRequest(`/api/expenses/${expenseId}`, {
                method: "PUT",
                body: JSON.stringify({
                    amount,
                    category,
                    description,
                    date,
                }),
            });
        } else {
            await apiRequest("/api/expenses", {
                method: "POST",
                body: JSON.stringify({
                    amount,
                    category,
                    description,
                    date,
                }),
            });
        }

        closeExpenseModal();

        await refreshDashboard();
    } catch (error) {
        console.error("Unable to save expense:", error);

        setExpenseMessage(
            error.message || "Unable to save expense."
        );
    } finally {
        elements.saveExpenseButton.disabled = false;
    }
}

async function editExpense(expenseId) {
    const expense = state.expenses.find(
        (item) => String(item.id) === String(expenseId)
    );

    if (!expense) {
        return;
    }

    openExpenseModal(expense);
}

async function deleteExpense(expenseId) {
    const expense = state.expenses.find(
        (item) => String(item.id) === String(expenseId)
    );

    if (!expense) {
        return;
    }

    const confirmed = window.confirm(
        `Delete this ${expense.category} expense of ${formatCurrency(
            expense.amount
        )}?`
    );

    if (!confirmed) {
        return;
    }

    try {
        await apiRequest(`/api/expenses/${expenseId}`, {
            method: "DELETE",
        });

        await refreshDashboard();
    } catch (error) {
        console.error("Unable to delete expense:", error);

        window.alert(
            error.message || "Unable to delete expense."
        );
    }
}

async function logout() {
    elements.logoutButton.disabled = true;

    try {
        await apiRequest("/api/auth/logout", {
            method: "POST",
        });
    } catch (error) {
        console.error("Logout error:", error);
    } finally {
        window.location.href = "login.html";
    }
}

async function refreshDashboard() {
    await Promise.all([
        loadExpenses(),
        loadTotalSpending(),
        loadCategorySummary(),
        loadMonthlySummary(),
    ]);
}

function handleExpenseAction(event) {
    const button = event.target.closest("[data-action]");

    if (!button) {
        return;
    }

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "edit") {
        editExpense(id);
    }

    if (action === "delete") {
        deleteExpense(id);
    }
}

function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach((item) => {
        item.addEventListener("click", () => {
            document.querySelectorAll(".nav-item").forEach((navItem) => {
                navItem.classList.remove("active");
            });

            item.classList.add("active");

            closeSidebar();
        });
    });
}

function setupEventListeners() {
    elements.menuButton.addEventListener("click", openSidebar);
    elements.sidebarClose.addEventListener("click", closeSidebar);
    elements.sidebarOverlay.addEventListener("click", closeSidebar);

    elements.heroAddExpenseButton.addEventListener(
        "click",
        () => openExpenseModal()
    );

    elements.sectionAddExpenseButton.addEventListener(
        "click",
        () => openExpenseModal()
    );

    elements.modalClose.addEventListener(
        "click",
        closeExpenseModal
    );

    elements.modalCancel.addEventListener(
        "click",
        closeExpenseModal
    );

    elements.expenseForm.addEventListener(
        "submit",
        saveExpense
    );

    elements.expenseTableBody.addEventListener(
        "click",
        handleExpenseAction
    );

    elements.mobileExpenses.addEventListener(
        "click",
        handleExpenseAction
    );

    elements.logoutButton.addEventListener(
        "click",
        logout
    );

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSidebar();

            if (!elements.expenseModal.hidden) {
                closeExpenseModal();
            }
        }
    });

    setupNavigation();
}

async function initializeDashboard() {
    setupEventListeners();

    await loadCurrentUser();
    await refreshDashboard();
}
function setupSectionNavigation() {
    const navigationItems = document.querySelectorAll(".nav-item");

    navigationItems.forEach((item) => {
        item.addEventListener("click", () => {
            navigationItems.forEach((navItem) => {
                navItem.classList.remove("active");
            });

            item.classList.add("active");
        });
    });
}


function setupScrollNavigation() {
    const navigationItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(
        ".dashboard-container > section[id]"
    );

    const observer = new IntersectionObserver(
        (entries) => {
            const visibleSections = entries
                .filter((entry) => entry.isIntersecting)
                .sort(
                    (first, second) =>
                        second.intersectionRatio -
                        first.intersectionRatio
                );

            if (!visibleSections.length) {
                return;
            }

            const activeSectionId =
                visibleSections[0].target.id;

            navigationItems.forEach((item) => {
                item.classList.toggle(
                    "active",
                    item.dataset.section === activeSectionId
                );
            });
        },
        {
            rootMargin: "-90px 0px -45% 0px",
            threshold: [0.1, 0.25, 0.5],
        }
    );

    sections.forEach((section) => observer.observe(section));
}
function applyExpenseFilters() {
    const searchTerm = elements.expenseSearch.value
        .trim()
        .toLowerCase();

    const selectedCategory =
        elements.expenseCategoryFilter.value
            .trim()
            .toLowerCase();

    const filteredExpenses = state.expenses.filter((expense) => {
        const category = String(
            expense.category || ""
        ).toLowerCase();

        const description = String(
            expense.description || ""
        ).toLowerCase();

        const matchesSearch =
            !searchTerm ||
            category.includes(searchTerm) ||
            description.includes(searchTerm);

        const matchesCategory =
            !selectedCategory ||
            category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    elements.expenseResultsCount.textContent =
        `Showing ${filteredExpenses.length} of ${state.expenses.length} expenses`;

    renderExpenses(filteredExpenses);
}
expenseSearch.addEventListener(
    "input",
    applyExpenseFilters
);

elements.expenseCategoryFilter.addEventListener(
    "change",
    applyExpenseFilters
);
elements.clearExpenseFilters.addEventListener(
    "click",
    () => {
        elements.expenseSearch.value = "";
        elements.expenseCategoryFilter.value = "";

        applyExpenseFilters();
    }
);
setupSectionNavigation();
setupScrollNavigation();

initializeDashboard();