/**
 * Student Savings Application - Main JavaScript File
 * 
 * Features:
 * - Tabungan (Savings) management
 * - Pengeluaran (Expenses) management
 * - Data filtering by date and class
 * - Interactive charts
 * - Excel export
 * - Data backup/restore
 */

// Constants
const MIN_AMOUNT = 1000;
const DATE_FORMAT_OPTIONS = { day: '2-digit', month: '2-digit', year: 'numeric' };

// Data Storage
const state = {
  dataTabungan: [],
  dataPengeluaran: [],
  filters: {
    kelas: 'all',
    tanggalAwal: '',
    tanggalAkhir: ''
  },
  chartType: 'bar'
};

// DOM Elements
const elements = {
  forms: {
    tabungan: document.getElementById("form-tabungan"),
    pengeluaran: document.getElementById("form-pengeluaran")
  },
  inputs: {
    nama: document.getElementById("nama"),
    kelas: document.getElementById("kelas"),
    jumlah: document.getElementById("jumlah"),
    tanggal: document.getElementById("tanggal"),
    kelasPengeluaran: document.getElementById("kelas-pengeluaran"),
    jumlahPengeluaran: document.getElementById("jumlah-pengeluaran"),
    keteranganPengeluaran: document.getElementById("keterangan-pengeluaran"),
    tanggalPengeluaran: document.getElementById("tanggal-pengeluaran"),
    filterKelas: document.getElementById("filter-kelas"),
    filterTanggalAwal: document.getElementById("filter-tanggal-awal"),
    filterTanggalAkhir: document.getElementById("filter-tanggal-akhir"),
    chartType: document.getElementById("chart-type")
  },
  buttons: {
    submitTabungan: document.getElementById("submit-tabungan"),
    submitPengeluaran: document.getElementById("submit-pengeluaran")
  },
  rekap: document.getElementById("rekap"),
  toast: document.getElementById("toast"),
  saldoChart: document.getElementById("saldoChart")
};

// Chart instance
let saldoChart = null;

// Initialize the application
function init() {
  setDefaultDates();
  loadFromLocalStorage();
  setupEventListeners();
  applyFilters();
}

// Set default dates for forms and filters
function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  elements.inputs.tanggal.value = today;
  elements.inputs.tanggalPengeluaran.value = today;
  elements.inputs.filterTanggalAwal.value = firstDayOfMonth;
  elements.inputs.filterTanggalAkhir.value = today;

  // Update state with default filter dates
  state.filters.tanggalAwal = firstDayOfMonth;
  state.filters.tanggalAkhir = today;
}

// Set up event listeners
function setupEventListeners() {
  // Form submissions
  elements.forms.tabungan.addEventListener("submit", handleSubmitTabungan);
  elements.forms.pengeluaran.addEventListener("submit", handleSubmitPengeluaran);
  
  // Filter controls
  elements.inputs.filterKelas.addEventListener("change", (e) => {
    state.filters.kelas = e.target.value;
    applyFilters();
  });
  
  elements.inputs.filterTanggalAwal.addEventListener("change", (e) => {
    state.filters.tanggalAwal = e.target.value;
    applyFilters();
  });
  
  elements.inputs.filterTanggalAkhir.addEventListener("change", (e) => {
    state.filters.tanggalAkhir = e.target.value;
    applyFilters();
  });
  
  elements.inputs.chartType.addEventListener("change", (e) => {
    state.chartType = e.target.value;
    renderChart();
  });
  
  // Action buttons
  document.getElementById("reset-filters").addEventListener("click", resetFilters);
  document.getElementById("export-excel").addEventListener("click", exportToExcel);
  document.getElementById("download-backup").addEventListener("click", downloadBackup);
  document.getElementById("reset-data").addEventListener("click", resetData);
  document.getElementById("upload-backup").addEventListener("change", handleUploadBackup);
  
  // Input validation
  setupInputValidation();
}

// Set up input validation
function setupInputValidation() {
  // Amount validation
  const amountInputs = [
    elements.inputs.jumlah,
    elements.inputs.jumlahPengeluaran
  ];
  
  amountInputs.forEach(input => {
    input.addEventListener("input", () => validateAmountInput(input));
    input.min = MIN_AMOUNT;
    input.step = MIN_AMOUNT;
  });
  
  // Required field validation
  document.querySelectorAll("[required]").forEach(input => {
    input.addEventListener("blur", () => validateRequiredInput(input));
  });
}

// Validate amount input
function validateAmountInput(input) {
  const value = parseInt(input.value);
  const isValid = !isNaN(value) && value >= MIN_AMOUNT;
  
  toggleInputError(input, !isValid, `Jumlah minimal Rp ${formatNumber(MIN_AMOUNT)}`);
  return isValid;
}

// Validate required input
function validateRequiredInput(input) {
  const isValid = input.value.trim() !== '';
  toggleInputError(input, !isValid, 'Field ini harus diisi');
  return isValid;
}

// Toggle input error state
function toggleInputError(input, isInvalid, message) {
  if (isInvalid) {
    input.classList.add("is-invalid");
    const feedbackElement = input.nextElementSibling;
    if (feedbackElement && feedbackElement.classList.contains("invalid-feedback")) {
      feedbackElement.textContent = message;
    }
  } else {
    input.classList.remove("is-invalid");
  }
}

// Validate form
function validateForm(form) {
  let isValid = true;
  
  // Validate required fields
  form.querySelectorAll("[required]").forEach(input => {
    if (input.value.trim() === "") {
      toggleInputError(input, true, 'Field ini harus diisi');
      isValid = false;
    }
  });
  
  // Validate amount fields
  const amountInput = form.querySelector("input[type='number']");
  if (amountInput && !validateAmountInput(amountInput)) {
    isValid = false;
  }
  
  return isValid;
}

// Handle tabungan form submission
async function handleSubmitTabungan(e) {
  e.preventDefault();
  
  if (!validateForm(elements.forms.tabungan)) {
    showToast("Harap isi semua field dengan benar", "error");
    return;
  }
  
  try {
    toggleLoadingState(elements.buttons.submitTabungan, true);
    
    const newEntry = {
      id: Date.now(),
      nama: elements.inputs.nama.value.trim(),
      kelas: elements.inputs.kelas.value,
      jumlah: parseInt(elements.inputs.jumlah.value),
      tanggal: elements.inputs.tanggal.value
    };
    
    state.dataTabungan.push(newEntry);
    saveToLocalStorage();
    renderRekap();
    renderChart();
    elements.forms.tabungan.reset();
    
    // Reset date to today
    elements.inputs.tanggal.value = new Date().toISOString().split('T')[0];
    
    showToast("Tabungan berhasil disimpan!", "success");
  } catch (error) {
    console.error("Error saving tabungan:", error);
    showToast("Gagal menyimpan tabungan", "error");
  } finally {
    toggleLoadingState(elements.buttons.submitTabungan, false);
  }
}

// Handle pengeluaran form submission
async function handleSubmitPengeluaran(e) {
  e.preventDefault();
  
  if (!validateForm(elements.forms.pengeluaran)) {
    showToast("Harap isi semua field dengan benar", "error");
    return;
  }
  
  try {
    toggleLoadingState(elements.buttons.submitPengeluaran, true);
    
    const newEntry = {
      id: Date.now(),
      kelas: elements.inputs.kelasPengeluaran.value,
      jumlah: parseInt(elements.inputs.jumlahPengeluaran.value),
      keterangan: elements.inputs.keteranganPengeluaran.value.trim(),
      tanggal: elements.inputs.tanggalPengeluaran.value
    };
    
    state.dataPengeluaran.push(newEntry);
    saveToLocalStorage();
    renderRekap();
    renderChart();
    elements.forms.pengeluaran.reset();
    
    // Reset date to today
    elements.inputs.tanggalPengeluaran.value = new Date().toISOString().split('T')[0];
    
    showToast("Pengeluaran berhasil disimpan!", "success");
  } catch (error) {
    console.error("Error saving pengeluaran:", error);
    showToast("Gagal menyimpan pengeluaran", "error");
  } finally {
    toggleLoadingState(elements.buttons.submitPengeluaran, false);
  }
}

// Toggle loading state for buttons
function toggleLoadingState(button, isLoading) {
  if (isLoading) {
    button.innerHTML = '<span class="spinner"></span> Menyimpan...';
    button.disabled = true;
  } else {
    button.innerHTML = '<i class="fas fa-save"></i> ' + button.textContent.trim();
    button.disabled = false;
  }
}

// Filter data based on current filters
function filterData(data) {
  return data.filter(item => {
    const kelasMatch = state.filters.kelas === 'all' || item.kelas === state.filters.kelas;
    const tanggalMatch = (!state.filters.tanggalAwal || item.tanggal >= state.filters.tanggalAwal) && 
                         (!state.filters.tanggalAkhir || item.tanggal <= state.filters.tanggalAkhir);
    return kelasMatch && tanggalMatch;
  });
}

// Apply filters and update UI
function applyFilters() {
  renderRekap();
  renderChart();
}

// Reset filters to default
function resetFilters() {
  state.filters.kelas = 'all';
  state.filters.tanggalAwal = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];
  state.filters.tanggalAkhir = new Date().toISOString().split('T')[0];
  
  // Update UI
  elements.inputs.filterKelas.value = state.filters.kelas;
  elements.inputs.filterTanggalAwal.value = state.filters.tanggalAwal;
  elements.inputs.filterTanggalAkhir.value = state.filters.tanggalAkhir;
  
  applyFilters();
  showToast("Filter telah direset", "success");
}

// Render summary report
function renderRekap() {
  const filteredTabungan = filterData(state.dataTabungan);
  const filteredPengeluaran = filterData(state.dataPengeluaran);
  
  // Sort by date (newest first)
  filteredTabungan.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  filteredPengeluaran.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  
  // Organize by class
  const tabunganByKelas = groupByKelas(filteredTabungan);
  const pengeluaranByKelas = groupByKelas(filteredPengeluaran);
  
  let html = '';
  let totalSemua = 0;
  let totalKeluarSemua = 0;
  
  // Render each class
  for (const kls of ['7', '8', '9']) {
    if (state.filters.kelas !== 'all' && kls !== state.filters.kelas) continue;
    
    const kelasTabungan = tabunganByKelas[kls] || [];
    const kelasPengeluaran = pengeluaranByKelas[kls] || [];
    
    if (kelasTabungan.length === 0 && kelasPengeluaran.length === 0) continue;
    
    const totalMasuk = kelasTabungan.reduce((sum, item) => sum + item.jumlah, 0);
    const totalKeluar = kelasPengeluaran.reduce((sum, item) => sum + item.jumlah, 0);
    const saldo = totalMasuk - totalKeluar;
    
    totalSemua += totalMasuk;
    totalKeluarSemua += totalKeluar;
    
    html += `
      <div class="card-kelas">
        <h3>Kelas ${kls}</h3>
        ${renderTransactionList('Tabungan Masuk', kelasTabungan, '➕')}
        ${renderTransactionList('Pengeluaran', kelasPengeluaran, '➖')}
        <div class="saldo-section">
          <h4>Saldo Akhir: Rp ${formatNumber(saldo)}</h4>
        </div>
      </div>
    `;
  }
  
  // Add grand total if showing all classes
  if (state.filters.kelas === 'all') {
    html += `
      <div class="grand-total">
        <h3>Total Semua Kelas</h3>
        <p>Total Pemasukan: Rp ${formatNumber(totalSemua)}</p>
        <p>Total Pengeluaran: Rp ${formatNumber(totalKeluarSemua)}</p>
        <p><strong>Saldo Akhir: Rp ${formatNumber(totalSemua - totalKeluarSemua)}</strong></p>
      </div>
    `;
  }
  
  elements.rekap.innerHTML = html || '<p class="no-data">Tidak ada data untuk filter yang dipilih</p>';
}

// Group data by class
function groupByKelas(data) {
  return data.reduce((acc, item) => {
    if (!acc[item.kelas]) acc[item.kelas] = [];
    acc[item.kelas].push(item);
    return acc;
  }, { '7': [], '8': [], '9': [] });
}

// Render transaction list
function renderTransactionList(title, transactions, icon) {
  if (transactions.length === 0) return '';
  
  const total = transactions.reduce((sum, item) => sum + item.jumlah, 0);
  const itemsHtml = transactions.map(item => `
    <li>
      <strong>${icon} ${item.nama || item.keterangan}: Rp ${formatNumber(item.jumlah)}</strong>
      <small>${formatDate(item.tanggal)}</small>
    </li>
  `).join('');
  
  return `
    <h4>${title}</h4>
    <ul>${itemsHtml}</ul>
    <p><strong>Total: Rp ${formatNumber(total)}</strong></p>
  `;
}

// Render chart
function renderChart() {
  const filteredTabungan = filterData(state.dataTabungan);
  const filteredPengeluaran = filterData(state.dataPengeluaran);
  
  // Calculate totals by class
  const totals = { '7': 0, '8': 0, '9': 0 };
  const expenses = { '7': 0, '8': 0, '9': 0 };
  
  filteredTabungan.forEach(item => totals[item.kelas] += item.jumlah);
  filteredPengeluaran.forEach(item => expenses[item.kelas] += item.jumlah);
  
  const balances = {
    '7': totals['7'] - expenses['7'],
    '8': totals['8'] - expenses['8'],
    '9': totals['9'] - expenses['9']
  };
  
  const ctx = elements.saldoChart.getContext('2d');
  
  // Destroy previous chart if exists
  if (saldoChart) saldoChart.destroy();
  
  // Create new chart
  saldoChart = new Chart(ctx, {
    type: state.chartType,
    data: getChartData(balances, totals, expenses),
    options: getChartOptions()
  });
}

// Get chart data
function getChartData(balances, totals, expenses) {
  return {
    labels: ['Kelas 7', 'Kelas 8', 'Kelas 9'],
    datasets: [
      {
        label: 'Saldo Akhir',
        data: [balances['7'], balances['8'], balances['9']],
        backgroundColor: [
          'rgba(67, 97, 238, 0.7)',
          'rgba(76, 201, 240, 0.7)',
          'rgba(247, 37, 133, 0.7)'
        ],
        borderColor: [
          'rgba(67, 97, 238, 1)',
          'rgba(76, 201, 240, 1)',
          'rgba(247, 37, 133, 1)'
        ],
        borderWidth: 1
      },
      {
        label: 'Total Masuk',
        data: [totals['7'], totals['8'], totals['9']],
        backgroundColor: [
          'rgba(67, 97, 238, 0.4)',
          'rgba(76, 201, 240, 0.4)',
          'rgba(247, 37, 133, 0.4)'
        ],
        borderWidth: 0
      },
      {
        label: 'Total Keluar',
        data: [expenses['7'], expenses['8'], expenses['9']],
        backgroundColor: [
          'rgba(231, 76, 60, 0.4)',
          'rgba(231, 76, 60, 0.4)',
          'rgba(231, 76, 60, 0.4)'
        ],
        borderWidth: 0
      }
    ]
  };
}

// Get chart options
function getChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Saldo Tabungan per Kelas',
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: Rp ${formatNumber(context.raw)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return 'Rp ' + formatNumber(value);
          }
        }
      }
    }
  };
}

// Export to Excel
function exportToExcel() {
  try {
    // Prepare data
    const data = [
      ["Jenis", "Kelas", "Nama/Keterangan", "Jumlah", "Tanggal"]
    ];
    
    // Add tabungan data
    state.dataTabungan.forEach(item => {
      data.push(["Tabungan", "Kelas " + item.kelas, item.nama, item.jumlah, item.tanggal]);
    });
    
    // Add pengeluaran data
    state.dataPengeluaran.forEach(item => {
      data.push(["Pengeluaran", "Kelas " + item.kelas, item.keterangan, -item.jumlah, item.tanggal]);
    });
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Tabungan");
    
    // Export to file
    const fileName = `Rekap_Tabungan_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    showToast("Data berhasil diekspor ke Excel", "success");
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    showToast("Gagal mengekspor data ke Excel", "error");
  }
}

// Download backup
function downloadBackup() {
  try {
    const data = {
      tabungan: state.dataTabungan,
      pengeluaran: state.dataPengeluaran,
      timestamp: new Date().toISOString(),
      version: 1.0
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_tabungan_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast("Backup data berhasil didownload", "success");
  } catch (error) {
    console.error("Error downloading backup:", error);
    showToast("Gagal membuat backup data", "error");
  }
}

// Handle backup upload
function handleUploadBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const data = JSON.parse(event.target.result);
      
      if (!data.tabungan || !data.pengeluaran) {
        throw new Error("Format file backup tidak valid");
      }
      
      if (confirm("Apakah Anda yakin ingin mengimpor data ini? Data saat ini akan digantikan.")) {
        state.dataTabungan = data.tabungan;
        state.dataPengeluaran = data.pengeluaran;
        saveToLocalStorage();
        applyFilters();
        showToast("Data berhasil diimpor dari backup", "success");
      }
    } catch (error) {
      console.error("Error reading backup file:", error);
      showToast("Gagal membaca file backup: " + error.message, "error");
    }
  };
  reader.onerror = function() {
    showToast("Gagal membaca file backup", "error");
  };
  reader.readAsText(file);
  
  // Reset input
  e.target.value = '';
}

// Reset all data
function resetData() {
  if (confirm("Yakin ingin menghapus semua data tabungan dan pengeluaran? Tindakan ini tidak dapat dibatalkan.")) {
    state.dataTabungan = [];
    state.dataPengeluaran = [];
    saveToLocalStorage();
    applyFilters();
    showToast("Semua data telah direset", "success");
  }
}

// Save data to localStorage
function saveToLocalStorage() {
  try {
    localStorage.setItem("dataTabungan", JSON.stringify(state.dataTabungan));
    localStorage.setItem("dataPengeluaran", JSON.stringify(state.dataPengeluaran));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
    showToast("Gagal menyimpan data ke penyimpanan lokal", "error");
  }
}

// Load data from localStorage
function loadFromLocalStorage() {
  try {
    const tabungan = localStorage.getItem("dataTabungan");
    const pengeluaran = localStorage.getItem("dataPengeluaran");
    
    if (tabungan) state.dataTabungan = JSON.parse(tabungan);
    if (pengeluaran) state.dataPengeluaran = JSON.parse(pengeluaran);
    
    // Validate loaded data
    if (!Array.isArray(state.dataTabungan)) state.dataTabungan = [];
    if (!Array.isArray(state.dataPengeluaran)) state.dataPengeluaran = [];
    
  } catch (error) {
    console.error("Error loading from localStorage:", error);
    state.dataTabungan = [];
    state.dataPengeluaran = [];
    showToast("Gagal memuat data dari penyimpanan lokal", "error");
  }
}

// Show toast notification
function showToast(message, type = "success", duration = 3000) {
  elements.toast.textContent = message;
  elements.toast.className = "toast show " + type;
  
  setTimeout(() => {
    elements.toast.classList.remove("show");
  }, duration);
}

// Format number with thousand separators
function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(num);
}

// Format date to DD/MM/YYYY
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('id-ID', DATE_FORMAT_OPTIONS);
}

// Initialize the application
document.addEventListener("DOMContentLoaded", init);