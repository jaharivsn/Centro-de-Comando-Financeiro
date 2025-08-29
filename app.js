class FinancialCommander {
    constructor() {
        this.state = {
            transactions: [],
            debts: [],
            goals: [],
            fixedExpenses: [],
            settings: { currency: 'BRL' }
        };
        this.exchangeRates = { BRL: 1, PEN: 0.75, USD: 5.25 };
        this.currencyLocales = { BRL: 'pt-BR', PEN: 'es-PE', USD: 'en-US' };
        this.currentPaymentTarget = null;
        this.currentPaymentType = '';
        this.init();
    }

    init() {
        this.loadState();
        this.setupEventListeners();
        this.renderAll();
    }
    
    loadState() {
        const savedState = localStorage.getItem('financialCommanderState');
        if (savedState) {
            this.state = JSON.parse(savedState);
            if (!this.state.settings) { this.state.settings = { currency: 'BRL' }; }
        } else {
            this.state.debts = [{ id: Date.now() + 1, name: "Mercado Pago", total: 129.05, remaining: 129.05 },{ id: Date.now() + 2, name: "Itaú", total: 26.19, remaining: 26.19 }];
            this.state.fixedExpenses = [
                { id: Date.now() + 3, name: "Adobe Creative Cloud", amount: 161.76, paymentMethod: 'Crédito' },
                { id: Date.now() + 4, name: "GPT Plus", amount: 110.00, paymentMethod: 'Crédito' },
                { id: Date.now() + 5, name: "Site 46Graus", amount: 35.00, paymentMethod: 'Crédito' },
                { id: Date.now() + 6, name: "Gamepass PC", amount: 36.00, paymentMethod: 'Crédito' },
                { id: Date.now() + 7, name: "Academia", amount: 120.00, paymentMethod: 'Débito' },
                { id: Date.now() + 8, name: "Kit Limpeza de Pele", amount: 220.00, paymentMethod: 'Crédito' },
            ];
            this.state.goals = [{ id: Date.now() + 9, name: "Paleta do Bruxo", target: 197.00, saved: 0, category: "Equipamento" },{ id: Date.now() + 10, name: "Tênis Basquete Ankaa", target: 267.00, saved: 0, category: "Glow Up" },];
        }
    }

    saveState() { localStorage.setItem('financialCommanderState', JSON.stringify(this.state)); }

    setupEventListeners() {
        document.getElementById('transaction-form').addEventListener('submit', (e) => { e.preventDefault(); this.addTransaction(e.submitter.dataset.type); });
        document.getElementById('add-debt-form').addEventListener('submit', (e) => { e.preventDefault(); this.addDebt(); });
        document.getElementById('add-goal-form').addEventListener('submit', (e) => { e.preventDefault(); this.addGoal(); });
        document.getElementById('add-fixed-expense-form').addEventListener('submit', (e) => { e.preventDefault(); this.addFixedExpense(); });
        document.getElementById('transaction-filter').addEventListener('change', () => this.renderTransactions());
        
        const historyYearFilter = document.getElementById('history-year-filter');
        const historyMonthFilter = document.getElementById('history-month-filter');
        historyYearFilter.addEventListener('change', () => { this.renderHistoryMonthFilter(); this.renderHistoryAnalytics(); });
        historyMonthFilter.addEventListener('change', () => this.renderHistoryAnalytics());

        document.getElementById('currency-selector').addEventListener('change', (e) => this.changeCurrency(e.target.value));

        document.body.addEventListener('click', (e) => {
            const target = e.target;
            const id = parseInt(target.closest('[data-id]')?.dataset.id);
            if (!id && !target.closest('#reset-data-btn')) return;
            if (target.closest('.delete-btn')) this.handleDelete(target, id);
            else if (target.closest('.pay-btn')) this.handlePay(target, id);
        });
        
        document.getElementById('reset-data-btn').addEventListener('click', () => this.openResetModal());
        document.getElementById('cancel-reset-btn').addEventListener('click', () => this.closeResetModal());
        document.getElementById('confirm-reset-btn').addEventListener('click', () => { this.resetData(); this.closeResetModal(); });
        
        document.getElementById('cancel-payment-btn').addEventListener('click', () => this.closePaymentModal());
        document.getElementById('confirm-payment-btn').addEventListener('click', () => this.confirmPayment());

        document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());
        document.getElementById('import-data-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
        document.getElementById('import-file-input').addEventListener('change', (e) => this.importData(e));
    }

    handleDelete(target, id) {
        if (target.closest('#transaction-list')) this.deleteTransaction(id);
        if (target.closest('#debt-list')) this.deleteDebt(id);
        if (target.closest('#goal-list')) this.deleteGoal(id);
        if (target.closest('#fixed-expense-list')) this.deleteFixedExpense(id);
    }
    
    handlePay(target, id) {
        if (target.closest('#debt-list')) this.openPaymentModal('debt', id);
        if (target.closest('#goal-list')) this.openPaymentModal('goal', id);
    }
    
    addTransaction(type) {
        const descInput = document.getElementById('trans-description');
        const amountInput = document.getElementById('trans-amount');
        const categoryInput = document.getElementById('trans-category');
        const currencyInput = document.getElementById('trans-currency');

        if (descInput.value.trim() && amountInput.value > 0) {
            const enteredAmount = parseFloat(amountInput.value);
            const selectedCurrency = currencyInput.value;
            const amountInBRL = enteredAmount / this.exchangeRates[selectedCurrency];

            this.state.transactions.push({ id: Date.now(), type, description: descInput.value.trim(), amount: amountInBRL, category: categoryInput.value, date: new Date().toISOString() });
            this.saveStateAndRender();
            descInput.value = ''; amountInput.value = ''; currencyInput.value = 'BRL';
        }
    }
    deleteTransaction(id) { this.state.transactions = this.state.transactions.filter(t => t.id !== id); this.saveStateAndRender(); }
    addDebt() {
        const nameInput = document.getElementById('debt-name');
        const totalInput = document.getElementById('debt-total');
        if (nameInput.value.trim() && totalInput.value > 0) {
            this.state.debts.push({ id: Date.now(), name: nameInput.value.trim(), total: parseFloat(totalInput.value), remaining: parseFloat(totalInput.value) });
            this.saveStateAndRender();
            nameInput.value = ''; totalInput.value = '';
        }
    }
    deleteDebt(id) { this.state.debts = this.state.debts.filter(d => d.id !== id); this.saveStateAndRender(); }
    addGoal() {
        const nameInput = document.getElementById('goal-name');
        const targetInput = document.getElementById('goal-target');
        const categoryInput = document.getElementById('goal-category');
        if (nameInput.value.trim() && targetInput.value > 0) {
            this.state.goals.push({ id: Date.now(), name: nameInput.value.trim(), target: parseFloat(targetInput.value), saved: 0, category: categoryInput.value });
            this.saveStateAndRender();
            nameInput.value = ''; targetInput.value = '';
        }
    }
    deleteGoal(id) { this.state.goals = this.state.goals.filter(g => g.id !== id); this.saveStateAndRender(); }
    
    addFixedExpense() {
        const nameInput = document.getElementById('fixed-name');
        const amountInput = document.getElementById('fixed-amount');
        const methodInput = document.getElementById('fixed-method');
        if(nameInput.value.trim() && amountInput.value > 0) {
            this.state.fixedExpenses.push({ 
                id: Date.now(), 
                name: nameInput.value.trim(), 
                amount: parseFloat(amountInput.value),
                paymentMethod: methodInput.value
            });
            this.saveStateAndRender();
            nameInput.value = ''; amountInput.value = '';
        }
    }
    deleteFixedExpense(id) { this.state.fixedExpenses = this.state.fixedExpenses.filter(fe => fe.id !== id); this.saveStateAndRender(); }
    
    openResetModal() { document.getElementById('reset-confirm-modal').classList.remove('hidden'); document.getElementById('reset-confirm-modal').classList.add('flex'); }
    closeResetModal() { document.getElementById('reset-confirm-modal').classList.add('hidden'); document.getElementById('reset-confirm-modal').classList.remove('flex'); }
    resetData() {
        const settings = this.state.settings;
        this.state = { transactions: [], debts: [], goals: [], fixedExpenses: [], settings };
        this.saveStateAndRender();
    }
    
    changeCurrency(newCurrency) { this.state.settings.currency = newCurrency; this.saveStateAndRender(); }
    
    openPaymentModal(type, id) {
        this.currentPaymentType = type;
        this.currentPaymentTarget = id;
        const modal = document.getElementById('payment-modal');
        const title = document.getElementById('payment-modal-title');
        const info = document.getElementById('payment-modal-info');
        
        if (type === 'debt') {
            const debt = this.state.debts.find(d => d.id === id);
            title.textContent = `Pagar Dívida: ${debt.name}`;
            info.textContent = `Restante: ${this.formatCurrency(debt.remaining)}`;
        } else {
            const goal = this.state.goals.find(g => g.id === id);
            title.textContent = `Contribuir para Compra: ${goal.name}`;
            info.textContent = `Salvo: ${this.formatCurrency(goal.saved)} de ${this.formatCurrency(goal.target)}`;
        }
        modal.classList.remove('hidden'); modal.classList.add('flex');
    }
    closePaymentModal() { document.getElementById('payment-modal').classList.add('hidden'); document.getElementById('payment-amount').value = ''; }
    
    confirmPayment() {
        const amountInput = parseFloat(document.getElementById('payment-amount').value);
        if (isNaN(amountInput) || amountInput <= 0) return;
        const currentCurrency = this.state.settings.currency;
        const rate = this.exchangeRates[currentCurrency];
        const amountInBRL = amountInput / rate;

        if (this.currentPaymentType === 'debt') {
            const debt = this.state.debts.find(d => d.id === this.currentPaymentTarget);
            const paymentAmountInBRL = Math.min(amountInBRL, debt.remaining);
            debt.remaining -= paymentAmountInBRL;
            this.addTransactionFromPayment(`Pagamento Dívida: ${debt.name}`, paymentAmountInBRL);
        } else {
            const goal = this.state.goals.find(g => g.id === this.currentPaymentTarget);
            const contributionAmountInBRL = Math.min(amountInBRL, goal.target - goal.saved);
            goal.saved += contributionAmountInBRL;
            this.addTransactionFromPayment(`Contribuição Compra: ${goal.name}`, contributionAmountInBRL);
        }
        this.closePaymentModal(); this.saveStateAndRender();
    }
    
    addTransactionFromPayment(description, amountInBRL){ this.state.transactions.push({ id: Date.now(), type: 'expense', description, amount: amountInBRL, category: "Pagamentos", date: new Date().toISOString() }); }

    exportData() {
        const dataStr = JSON.stringify(this.state, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        link.download = `backup-centro-de-comando-${date}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            if (confirm('Tem certeza que deseja importar este backup? Todos os dados atuais serão substituídos.')) {
                try {
                    const newState = JSON.parse(e.target.result);
                    if (newState.transactions && newState.debts && newState.goals && newState.fixedExpenses && newState.settings) {
                        this.state = newState;
                        this.saveState();
                        location.reload();
                    } else {
                        alert('Erro: O arquivo não parece ser um backup válido do Centro de Comando.');
                    }
                } catch (error) {
                    alert('Erro: Arquivo de backup inválido ou corrompido.');
                }
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    renderAll() {
        this.renderHeader(); this.renderTools(); this.renderKPIsAndInsights(); this.renderTransactions();
        this.renderDebts(); this.renderGoals(); this.renderFixedExpenses(); this.renderHistoryYearFilter();
        this.renderHistoryMonthFilter(); this.renderHistoryAnalytics(); lucide.createIcons();
    }

    renderHeader() {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('full-date-header').textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    }
    
    renderTools() {
        const selector = document.getElementById('currency-selector');
        selector.innerHTML = '';
        Object.keys(this.exchangeRates).forEach(currency => {
            const option = new Option(`${currency}`, currency);
            selector.add(option);
        });
        selector.value = this.state.settings.currency;
    }

    renderKPIsAndInsights() {
        const now = new Date(), currentMonth = now.getMonth(), currentYear = now.getFullYear();
        const monthlyTransactions = this.state.transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; });
        const income = monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenseFromTransactions = monthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const expenseFromFixed = this.state.fixedExpenses.reduce((s, fe) => s + fe.amount, 0);
        const totalExpense = expenseFromTransactions + expenseFromFixed;
        const balance = income - totalExpense;
        const totalDebt = this.state.debts.reduce((s, d) => s + d.remaining, 0);

        const kpiBalance = document.getElementById('kpi-balance');
        kpiBalance.textContent = this.formatCurrency(balance);
        kpiBalance.className = `text-2xl font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`;
        document.getElementById('kpi-income').textContent = this.formatCurrency(income);
        document.getElementById('kpi-expense').textContent = this.formatCurrency(totalExpense);
        document.getElementById('kpi-debt').textContent = this.formatCurrency(totalDebt);

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const avgDailyExpense = totalExpense / now.getDate() || 0;
        
        const yearlyTransactions = this.state.transactions.filter(t => new Date(t.date).getFullYear() === currentYear);
        const annualIncome = yearlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const annualVarExpenses = yearlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const annualFixedExpenses = this.state.fixedExpenses.reduce((s, fe) => s + fe.amount, 0) * (currentMonth + 1);
        const annualBalance = annualIncome - (annualFixedExpenses + annualVarExpenses);
        
        const insightAnnualBalance = document.getElementById('insight-annual-balance');
        insightAnnualBalance.textContent = this.formatCurrency(annualBalance);
        insightAnnualBalance.className = `font-bold text-lg ${annualBalance >= 0 ? 'text-green-400' : 'text-red-400'}`;
        document.getElementById('insight-avg-daily').textContent = this.formatCurrency(avgDailyExpense);
        document.getElementById('insight-monthly-projection').textContent = this.formatCurrency(avgDailyExpense * daysInMonth);
    }

    renderTransactions() {
        const list = document.getElementById('transaction-list'), filter = document.getElementById('transaction-filter');
        const categories = [...new Set(this.state.transactions.map(t => t.category))];
        const currentFilterValue = filter.value;
        filter.innerHTML = '<option>Todas</option>';
        categories.sort().forEach(c => filter.add(new Option(c)));
        filter.value = currentFilterValue;
        const filteredTransactions = this.state.transactions.filter(t => filter.value === 'Todas' || t.category === filter.value);
        list.innerHTML = filteredTransactions.length ? '' : '<p class="text-sm text-gray-500">Nenhuma transação encontrada.</p>';
        filteredTransactions.slice().reverse().forEach(t => {
            const item = document.createElement('li');
            item.className = `flex justify-between items-center p-2 rounded ${t.type === 'income' ? 'bg-green-900/50' : 'bg-red-900/50'}`;
            item.dataset.id = t.id;
            item.innerHTML = `<div><span class="font-medium">${t.description}</span><span class="text-xs text-gray-400 block">${t.category} - ${new Date(t.date).toLocaleDateString('pt-BR')}</span></div><div class="flex items-center gap-2"><span class="font-bold">${this.formatCurrency(t.amount)}</span><button class="delete-btn text-gray-500 hover:text-red-400"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>`;
            list.appendChild(item);
        });
    }

    renderDebts() {
        const list = document.getElementById('debt-list');
        list.innerHTML = this.state.debts.length ? '' : '<p class="text-sm text-gray-500">Nenhuma dívida. Parabéns!</p>';
        this.state.debts.forEach(d => {
            const percentage = d.total > 0 ? ((d.total - d.remaining) / d.total) * 100 : 100;
            const item = document.createElement('li'); item.dataset.id = d.id;
            item.innerHTML = `<div class="flex justify-between items-center text-sm mb-1"><span>${d.name}</span><span class="font-mono">${this.formatCurrency(d.remaining)}</span></div><div class="w-full bg-gray-700 rounded-full h-2.5"><div class="bg-green-600 h-2.5 rounded-full" style="width: ${percentage}%"></div></div><div class="flex justify-end gap-2 mt-2"><button class="pay-btn bg-blue-600 text-white px-2 py-1 text-xs rounded hover:bg-blue-700">Pagar</button><button class="delete-btn text-gray-500 hover:text-red-400"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>`;
            list.appendChild(item);
        });
    }

    renderGoals() {
        const container = document.getElementById('goal-list');
        container.innerHTML = this.state.goals.length ? '' : '<p class="text-sm text-gray-500">Adicione uma meta de compra.</p>';
        const goalsByCategory = this.state.goals.reduce((acc, goal) => { (acc[goal.category] = acc[goal.category] || []).push(goal); return acc; }, {});
        Object.keys(goalsByCategory).sort().forEach(category => {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = `<h3 class="font-semibold text-blue-400 mb-2">${category}</h3>`;
            const list = document.createElement('ul'); list.className = 'space-y-3';
            goalsByCategory[category].forEach(g => {
                const percentage = g.target > 0 ? (g.saved / g.target) * 100 : 0;
                const item = document.createElement('li'); item.dataset.id = g.id;
                item.innerHTML = `<div class="flex justify-between items-center text-sm mb-1"><span>${g.name}</span><span class="font-mono">${this.formatCurrency(g.saved)} / ${this.formatCurrency(g.target)}</span></div><div class="w-full bg-gray-700 rounded-full h-2.5"><div class="bg-blue-600 h-2.5 rounded-full progress-bar-fill" style="width: ${percentage}%"></div></div><div class="flex justify-end gap-2 mt-2"><button class="pay-btn bg-green-600 text-white px-2 py-1 text-xs rounded hover:bg-green-700">Contribuir</button><button class="delete-btn text-gray-500 hover:text-red-400"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>`;
                list.appendChild(item);
            });
            wrapper.appendChild(list); container.appendChild(wrapper);
        });
    }
    
    renderFixedExpenses() {
        const list = document.getElementById('fixed-expense-list');
        list.innerHTML = this.state.fixedExpenses.length ? '' : '<p class="text-sm text-gray-500">Sem custos fixos.</p>';
        this.state.fixedExpenses.forEach(fe => {
            const item = document.createElement('li');
            const methodColor = fe.paymentMethod === 'Crédito' ? 'bg-sky-500' : 'bg-purple-500';
            item.className = 'flex justify-between items-center text-sm p-2 rounded-md hover:bg-gray-800/50';
            item.dataset.id = fe.id;
            item.innerHTML = `
                <div>
                    <span class="font-medium">${fe.name}</span>
                    <span class="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${methodColor} text-white">${fe.paymentMethod}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span>${this.formatCurrency(fe.amount)}</span>
                    <button class="delete-btn text-gray-500 hover:text-red-400"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>`;
            list.appendChild(item);
        });
    }

    renderHistoryYearFilter() {
        const filter = document.getElementById('history-year-filter');
        const uniqueYears = [...new Set(this.state.transactions.map(t => new Date(t.date).getFullYear()))];
        const currentYear = new Date().getFullYear();
        if(!uniqueYears.includes(currentYear)) uniqueYears.push(currentYear);
        const currentFilterValue = filter.value;
        filter.innerHTML = '';
        uniqueYears.sort((a,b) => b - a).forEach(year => filter.add(new Option(year, year)));
        filter.value = currentFilterValue || currentYear;
    }
    
    renderHistoryMonthFilter() {
        const yearFilter = document.getElementById('history-year-filter');
        const monthFilter = document.getElementById('history-month-filter');
        const selectedYear = parseInt(yearFilter.value);
        const currentFilterValue = monthFilter.value;
        monthFilter.innerHTML = '<option value="all">Ano Inteiro</option>';
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            const monthName = new Date(selectedYear, monthIndex).toLocaleString('pt-BR', { month: 'long' });
            monthFilter.add(new Option(monthName.charAt(0).toUpperCase() + monthName.slice(1), monthIndex));
        }
        monthFilter.value = currentFilterValue;
    }

    renderHistoryAnalytics() {
        const year = parseInt(document.getElementById('history-year-filter').value);
        const month = document.getElementById('history-month-filter').value;
        let filteredTransactions = this.state.transactions.filter(t => new Date(t.date).getFullYear() === year);
        let monthsInPeriod = 12;
        if (month !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => new Date(t.date).getMonth() === parseInt(month));
            monthsInPeriod = 1;
        }
        const fixedExpensesForPeriod = this.state.fixedExpenses.reduce((s, fe) => s + fe.amount, 0) * monthsInPeriod;
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) + fixedExpensesForPeriod;
        const balance = income - expense;

        const historyBalance = document.getElementById('history-balance');
        historyBalance.textContent = this.formatCurrency(balance);
        historyBalance.className = `font-bold text-lg ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`;
        document.getElementById('history-income').textContent = this.formatCurrency(income);
        document.getElementById('history-expense').textContent = this.formatCurrency(expense);
    }

    saveStateAndRender() { this.saveState(); this.renderAll(); }
    
    formatCurrency(value) {
        const currency = this.state.settings.currency;
        const rate = this.exchangeRates[currency];
        const convertedValue = value / rate;
        const locale = this.currencyLocales[currency] || 'pt-BR';
        return (convertedValue || 0).toLocaleString(locale, { style: 'currency', currency: currency });
    }
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => console.log('ServiceWorker registration successful: ', registration.scope))
      .catch(err => console.log('ServiceWorker registration failed: ', err));
  });
}

new FinancialCommander();