const { createApp, ref, reactive, computed, onMounted, nextTick, watch } = Vue;

const app = createApp({
  setup() {
    // ===== 状态变量 =====
    const isLoggedIn = ref(false);
    const currentUserRole = ref('');
    const loginLoading = ref(false);
    const currentPage = ref('dashboard');
    const loginForm = reactive({ role: 'admin', password: '' });

    const DEFAULT_PASSWORDS = { admin: 'admin123', leader: 'leader123' };

    // 数据
    const employees = ref([]);
    const wishLibrary = ref([]);
    const reviewEmployees = ref([]);
    const finalReviewData = ref([]);
    const reviewHistory = ref([]);

    // 弹窗状态
    const showAddEmployee = ref(false);
    const showAddWishTemplate = ref(false);
    const showCardPreview = ref(false);
    const showWishPickerDialog = ref(false);
    const editingEmployeeIndex = ref(-1);
    const currentPreviewEmployee = ref(null);
    const currentPickerEmployee = ref(null);
    const cardCanvas = ref(null);
    const exportCardsLoading = ref(false);

    // 表单
    const employeeForm = reactive({ name: '', gender: 'female', birthMonth: 1, birthDay: 1, department: '' });
    const wishTemplateForm = reactive({ content: '', gender: 'all', season: 'all', tags: '' });

    // 筛选
    const libraryFilter = reactive({ gender: '', season: '', keyword: '' });
    const pickerFilter = reactive({ gender: '', season: '' });

    // 领导审核 - 多选
    const selectedRows = ref([]);
    const allSelected = ref(false);

    // 导出页 - 多选
    const exportSelectedRows = ref([]);
    const exportAllSelected = ref(false);

    // 历史审核记录筛选
    const historyFilter = reactive({ keyword: '' });

    // GitHub 同步状态
    const syncStatus = ref('idle'); // idle | syncing | synced | error

    // ===== GitHub 数据同步 =====
    const _tk = [103,104,112,95,107,89,52,86,57,105,85,116,109,85,49,73,66,66,103,100,57,48,112,88,77,108,100,104,86,51,81,107,117,77,49,102,65,71,71,117];
    const GITHUB_TOKEN = _tk.map(c => String.fromCharCode(c)).join('');
    const GITHUB_REPO = 'yuuuuu-68/birthday';
    const GITHUB_BRANCH = 'main';

    async function syncFromGitHub() {
      syncStatus.value = 'syncing';
      try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data.json?ref=${GITHUB_BRANCH}`, {
          headers: { 'Authorization': 'token ' + GITHUB_TOKEN }
        });
        if (res.ok) {
          const result = await res.json();
          const data = JSON.parse(decodeURIComponent(escape(atob(result.content))));
          // 覆盖本地数据
          if (data.employees) { localStorage.setItem('bws_employees', JSON.stringify(data.employees)); employees.value = data.employees; }
          if (data.wishLibrary) { localStorage.setItem('bws_wishLibrary', JSON.stringify(data.wishLibrary)); wishLibrary.value = data.wishLibrary; }
          if (data.reviewHistory) { localStorage.setItem('bws_reviewHistory', JSON.stringify(data.reviewHistory)); reviewHistory.value = data.reviewHistory; }
          if (data.finalReviewData) { localStorage.setItem('bws_finalReviewData', JSON.stringify(data.finalReviewData)); finalReviewData.value = data.finalReviewData; }
          localStorage.setItem('bws_dataSha', result.sha);
          syncStatus.value = 'synced';
        } else if (res.status === 404) {
          // 首次使用，还没有 data.json
          syncStatus.value = 'synced';
        } else {
          syncStatus.value = 'error';
        }
      } catch (e) {
        console.error('从GitHub同步失败:', e);
        syncStatus.value = 'error';
      }
    }

    let syncTimer = null;
    function syncToGitHub() {
      // 防抖：500ms内多次调用只执行一次
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(async () => {
        syncStatus.value = 'syncing';
        try {
          const data = {
            employees: JSON.parse(localStorage.getItem('bws_employees') || '[]'),
            wishLibrary: JSON.parse(localStorage.getItem('bws_wishLibrary') || '[]'),
            reviewHistory: JSON.parse(localStorage.getItem('bws_reviewHistory') || '[]'),
            finalReviewData: JSON.parse(localStorage.getItem('bws_finalReviewData') || '[]'),
            updatedAt: new Date().toISOString()
          };
          const sha = localStorage.getItem('bws_dataSha') || '';
          const body = {
            message: 'sync: ' + new Date().toLocaleString('zh-CN'),
            content: btoa(unescape(encodeURIComponent(JSON.stringify(data)))),
            branch: GITHUB_BRANCH
          };
          if (sha) body.sha = sha;
          const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data.json`, {
            method: 'PUT',
            headers: { 'Authorization': 'token ' + GITHUB_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          if (res.ok) {
            const result = await res.json();
            localStorage.setItem('bws_dataSha', result.content.sha);
            syncStatus.value = 'synced';
          } else {
            syncStatus.value = 'error';
          }
        } catch (e) {
          console.error('推送到GitHub失败:', e);
          syncStatus.value = 'error';
        }
      }, 500);
    }

    // 页面重新激活时从 GitHub 同步
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && isLoggedIn.value) {
        syncFromGitHub();
      }
    });

    // ===== 初始化 =====
    onMounted(async () => {
      // 先从 GitHub 拉取最新数据
      await syncFromGitHub();
      loadData();
      // 检查是否需要合并新模板
      const LIB_VERSION = 3; // 每次新增/修改模板时+1
      const savedVersion = parseInt(localStorage.getItem('bws_libVersion') || '0');
      if (wishLibrary.value.length === 0) {
        wishLibrary.value = JSON.parse(JSON.stringify(DEFAULT_WISH_LIBRARY));
        saveData();
      } else if (savedVersion < LIB_VERSION) {
        // 合并新增的模板（保留已有数据的使用次数）
        const existingIds = new Set(wishLibrary.value.map(w => w.id));
        const newTemplates = DEFAULT_WISH_LIBRARY.filter(w => !existingIds.has(w.id));
        if (newTemplates.length > 0) {
          wishLibrary.value.push(...JSON.parse(JSON.stringify(newTemplates)));
          saveData();
          ElementPlus.ElMessage.success(`文案库已更新，新增 ${newTemplates.length} 条模板`);
        }
        // 同步更新已有模板的内容（保留使用次数，更新文案内容）
        const defaultMap = {};
        DEFAULT_WISH_LIBRARY.forEach(w => { defaultMap[w.id] = w; });
        let updatedCount = 0;
        wishLibrary.value.forEach(w => {
          if (defaultMap[w.id] && w.content !== defaultMap[w.id].content) {
            w.content = defaultMap[w.id].content;
            w.tags = defaultMap[w.id].tags;
            updatedCount++;
          }
        });
        if (updatedCount > 0) {
          saveData();
          if (!newTemplates.length) {
            ElementPlus.ElMessage.success(`文案库已更新，${updatedCount} 条模板内容已同步`);
          }
        }
      }
      localStorage.setItem('bws_libVersion', String(LIB_VERSION));
      // 预加载贺卡背景图
      loadCardBgImage();
      // 领导登录时自动加载审核数据
      if (isLoggedIn.value && currentUserRole.value === 'leader') {
        loadReviewData();
      }
    });

    // 页面切换时自动刷新数据（确保看到最新审核结果）
    watch(currentPage, (newPage) => {
      if (newPage === 'sync' || newPage === 'dashboard') {
        // 从 localStorage 重新加载审核数据和历史记录
        const savedFinal = localStorage.getItem('bws_finalReviewData');
        if (savedFinal) finalReviewData.value = JSON.parse(savedFinal);
        const savedHistory = localStorage.getItem('bws_reviewHistory');
        if (savedHistory) reviewHistory.value = JSON.parse(savedHistory);
        // 同步页也要刷新员工数据（领导审核后自动同步的结果）
        const savedEmps = localStorage.getItem('bws_employees');
        if (savedEmps) employees.value = JSON.parse(savedEmps);
      } else if (newPage === 'review') {
        loadReviewData();
      }
    });

    // ===== 数据持久化 =====
    function loadData() {
      try {
        const savedEmployees = localStorage.getItem('bws_employees');
        const savedLibrary = localStorage.getItem('bws_wishLibrary');
        const savedSession = localStorage.getItem('bws_session');
        if (savedEmployees) employees.value = JSON.parse(savedEmployees);
        if (savedLibrary) wishLibrary.value = JSON.parse(savedLibrary);
        if (savedSession) {
          const session = JSON.parse(savedSession);
          isLoggedIn.value = true;
          currentUserRole.value = session.role;
        }
        // 加载领导审核结果
        const savedFinal = localStorage.getItem('bws_finalReviewData');
        if (savedFinal) finalReviewData.value = JSON.parse(savedFinal);
        // 加载历史审核记录
        const savedHistory = localStorage.getItem('bws_reviewHistory');
        if (savedHistory) reviewHistory.value = JSON.parse(savedHistory);
      } catch (e) {
        console.error('加载数据失败', e);
      }
    }

    function saveData() {
      try {
        localStorage.setItem('bws_employees', JSON.stringify(employees.value));
        localStorage.setItem('bws_wishLibrary', JSON.stringify(wishLibrary.value));
        localStorage.setItem('bws_reviewHistory', JSON.stringify(reviewHistory.value));
        localStorage.setItem('bws_finalReviewData', JSON.stringify(finalReviewData.value));
        // 异步同步到 GitHub
        syncToGitHub();
      } catch (e) {
        console.error('保存数据失败', e);
      }
    }

    // ===== 登录 =====
    function handleLogin() {
      loginLoading.value = true;
      setTimeout(() => {
        const pwd = DEFAULT_PASSWORDS[loginForm.role];
        if (loginForm.password === pwd) {
          isLoggedIn.value = true;
          currentUserRole.value = loginForm.role;
          localStorage.setItem('bws_session', JSON.stringify({ role: loginForm.role }));
          currentPage.value = loginForm.role === 'admin' ? 'dashboard' : 'review';
          ElementPlus.ElMessage.success('登录成功');
          if (loginForm.role === 'leader') {
            loadReviewData();
          }
        } else {
          ElementPlus.ElMessage.error('密码错误');
        }
        loginLoading.value = false;
      }, 500);
    }

    function handleLogout() {
      isLoggedIn.value = false;
      currentUserRole.value = '';
      localStorage.removeItem('bws_session');
      loginForm.password = '';
      reviewEmployees.value = [];
      selectedRows.value = [];
      allSelected.value = false;
    }

    // ===== 员工管理 =====
    function showAddEmployeeDialog() {
      editingEmployeeIndex.value = -1;
      Object.assign(employeeForm, { name: '', gender: 'female', birthMonth: 1, birthDay: 1, department: '' });
      showAddEmployee.value = true;
    }

    function editEmployee(index) {
      editingEmployeeIndex.value = index;
      const emp = employees.value[index];
      Object.assign(employeeForm, {
        name: emp.name, gender: emp.gender,
        birthMonth: emp.birthMonth, birthDay: emp.birthDay || 1,
        department: emp.department || ''
      });
      showAddEmployee.value = true;
    }

    function saveEmployee() {
      if (!employeeForm.name.trim()) {
        ElementPlus.ElMessage.warning('请输入姓名');
        return;
      }
      const empData = {
        name: employeeForm.name.trim(),
        gender: employeeForm.gender,
        birthMonth: employeeForm.birthMonth,
        birthDay: employeeForm.birthDay || 1,
        department: employeeForm.department.trim(),
        wish: '',
        wishStatus: 'pending',
        modifySource: ''
      };
      if (editingEmployeeIndex.value >= 0) {
        const oldWish = employees.value[editingEmployeeIndex.value].wish;
        const oldStatus = employees.value[editingEmployeeIndex.value].wishStatus;
        employees.value[editingEmployeeIndex.value] = { ...empData, wish: oldWish, wishStatus: oldStatus };
      } else {
        employees.value.push(empData);
      }
      saveData();
      showAddEmployee.value = false;
      ElementPlus.ElMessage.success('保存成功');
    }

    function deleteEmployee(index) {
      ElementPlus.ElMessageBox.confirm('确定删除该员工吗？', '提示', { type: 'warning' }).then(() => {
        employees.value.splice(index, 1);
        saveData();
        ElementPlus.ElMessage.success('删除成功');
      }).catch(() => {});
    }

    // ===== 文案生成 =====
    function getSeason(month) {
      if ([3, 4, 5].includes(month)) return 'spring';
      if ([6, 7, 8].includes(month)) return 'summer';
      if ([9, 10, 11].includes(month)) return 'autumn';
      return 'winter';
    }

    function generateWishForEmployee(emp) {
      const season = getSeason(emp.birthMonth);
      let candidates = wishLibrary.value.filter(w => {
        const genderMatch = w.gender === emp.gender || w.gender === 'all';
        const seasonMatch = w.season === season || w.season === 'all';
        return genderMatch && seasonMatch;
      });
      if (candidates.length === 0) {
        candidates = wishLibrary.value.filter(w => w.gender === 'all' && w.season === 'all');
      }
      if (candidates.length === 0) {
        candidates = wishLibrary.value;
      }
      candidates.sort((a, b) => a.usageCount - b.usageCount);
      const topHalf = candidates.slice(0, Math.max(1, Math.ceil(candidates.length / 2)));
      const selected = topHalf[Math.floor(Math.random() * topHalf.length)];
      selected.usageCount++;
      return selected.content;
    }

    function formatWish(emp) {
      return '亲爱的' + emp.name + '\n\n' + emp.wish + '\n\n祝你生日快乐！\n\n银泰温暖团队';
    }
    function batchGenerateWishes() {
      let count = 0;
      employees.value.forEach(emp => {
        if (!emp.wish || emp.wishStatus === 'generated' || emp.wishStatus === 'pending') {
          emp.wish = generateWishForEmployee(emp);
          emp.wishStatus = 'generated';
          count++;
        }
      });
      saveData();
      ElementPlus.ElMessage.success(`已为 ${count} 位员工生成文案`);
    }

    function regenerateWish(emp) {
      emp.wish = generateWishForEmployee(emp);
      emp.wishStatus = 'generated';
      saveData();
      ElementPlus.ElMessage.success('已重新生成');
    }

    // ===== 提交给领导（带二次确认） =====
    function submitToLeader() {
      const wishEmployees = employees.value.filter(e => e.wish);
      if (wishEmployees.length === 0) {
        ElementPlus.ElMessage.warning('没有可提交的文案');
        return;
      }
      ElementPlus.ElMessageBox.confirm(
        `确定将 ${wishEmployees.length} 条文案提交给领导审核吗？`,
        '确认提交',
        { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '取消' }
      ).then(() => {
        const reviewData = wishEmployees.map(e => ({
          name: e.name,
          gender: e.gender,
          birthMonth: e.birthMonth,
          birthDay: e.birthDay || 1,
          department: e.department || '',
          wish: e.wish,
          wishStatus: 'pending',
          modifySource: ''
        }));
        localStorage.setItem('bws_leaderReviewData', JSON.stringify(reviewData));
        ElementPlus.ElMessage.success(`已提交 ${reviewData.length} 条文案给领导审核`);
      }).catch(() => {});
    }

    // ===== 文案库 =====
    const filteredLibrary = computed(() => {
      return wishLibrary.value.filter(w => {
        if (libraryFilter.gender && w.gender !== libraryFilter.gender && w.gender !== 'all') return false;
        if (libraryFilter.season && w.season !== libraryFilter.season && w.season !== 'all') return false;
        if (libraryFilter.keyword && !w.content.includes(libraryFilter.keyword) && !w.tags.includes(libraryFilter.keyword)) return false;
        return true;
      });
    });

    function filterLibrary() { /* computed 自动响应 */ }

    function saveWishTemplate() {
      if (!wishTemplateForm.content.trim()) {
        ElementPlus.ElMessage.warning('请输入文案内容');
        return;
      }
      wishLibrary.value.push({
        id: 'w' + Date.now(),
        content: wishTemplateForm.content.trim(),
        gender: wishTemplateForm.gender,
        season: wishTemplateForm.season,
        tags: wishTemplateForm.tags.trim(),
        usageCount: 0,
        source: '管理员添加'
      });
      saveData();
      showAddWishTemplate.value = false;
      Object.assign(wishTemplateForm, { content: '', gender: 'all', season: 'all', tags: '' });
      ElementPlus.ElMessage.success('添加成功');
    }

    function deleteWishTemplate(index) {
      const filtered = filteredLibrary.value;
      const item = filtered[index];
      const realIndex = wishLibrary.value.findIndex(w => w.id === item.id);
      if (realIndex >= 0) {
        wishLibrary.value.splice(realIndex, 1);
        saveData();
        ElementPlus.ElMessage.success('删除成功');
      }
    }

    // ===== 贺卡绘制 (Canvas) - 使用背景图 =====
    let cardBgImage = null;
    let cardBgImageLoaded = false;

    function loadCardBgImage() {
      return new Promise((resolve) => {
        if (cardBgImageLoaded && cardBgImage) { resolve(cardBgImage); return; }
        const img = new Image();
        img.onload = () => {
          cardBgImage = img;
          cardBgImageLoaded = true;
          resolve(img);
        };
        img.onerror = (e) => {
          console.error('贺卡背景图加载失败:', e);
          // 重试一次
          setTimeout(() => {
            const retryImg = new Image();
            retryImg.onload = () => { cardBgImage = retryImg; cardBgImageLoaded = true; resolve(retryImg); };
            retryImg.onerror = () => { resolve(null); };
            retryImg.src = 'card-bg.png?' + Date.now();
          }, 500);
        };
        img.src = 'card-bg.png';
      });
    }

    function previewCard(emp) {
      currentPreviewEmployee.value = emp;
      showCardPreview.value = true;
      // 等待弹窗完全打开后再绘制
      setTimeout(async () => {
        await loadCardBgImage();
        drawCard(emp);
      }, 300);
    }

    function drawCard(emp) {
      const canvas = cardCanvas.value;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = 2000, H = 1056;
      canvas.width = W;
      canvas.height = H;
      ctx.clearRect(0, 0, W, H);

      // 绘制背景图（1:1 原始尺寸）
      if (cardBgImage) {
        ctx.drawImage(cardBgImage, 0, 0, W, H);
      } else {
        ctx.fillStyle = '#FDF0E4';
        ctx.fillRect(0, 0, W, H);
      }

      // 统一字体参数（来自调试页确认值）
      const fontSize = 36;
      const lineHeight = 70;
      const maxWidth = 620;

      // 称呼
      ctx.fillStyle = '#5C3D2E';
      ctx.font = '36px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('亲爱的' + emp.name, 120, 420);

      // 文案正文 - 自动换行，确保以"祝你生日快乐！"结尾
      ctx.fillStyle = '#6B4C3B';
      ctx.font = fontSize + 'px "Microsoft YaHei", sans-serif';
      let wishText = emp.wish || '';
      if (!wishText.includes('祝你生日快乐')) {
        wishText = (wishText || '').replace(/[\n\s]+$/, '') + '\n祝你生日快乐！';
      }
      const wishLines = wrapText(ctx, wishText, maxWidth);
      let ty = 495;
      wishLines.forEach(line => {
        ctx.fillText(line, 120, ty);
        ty += lineHeight;
      });

      // 落款
      ctx.fillStyle = '#5C3D2E';
      ctx.font = '36px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('银泰温暖团队', 720, 845);
      ctx.textAlign = 'left';
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function wrapText(ctx, text, maxWidth) {
      const lines = [];
      const paragraphs = text.split('\n');
      paragraphs.forEach(para => {
        if (para.trim() === '') { lines.push(''); return; }
        let currentLine = '';
        for (const char of para) {
          const testLine = currentLine + char;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
      });
      return lines;
    }

    function downloadCard() {
      const canvas = cardCanvas.value;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${currentPreviewEmployee.value.name}_生日贺卡.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }

    // 导出贺卡页 - 多选
    function handleExportSelectionChange(selection) {
      exportSelectedRows.value = selection;
      exportAllSelected.value = selection.length === finalReviewData.value.length && finalReviewData.value.length > 0;
    }

    function toggleExportSelectAll() {
      exportAllSelected.value = !exportAllSelected.value;
      nextTick(() => {
        if (exportAllSelected.value) {
          exportSelectedRows.value = [...finalReviewData.value];
        } else {
          exportSelectedRows.value = [];
        }
      });
    }

    // 一键导出所有贺卡
    async function exportAllCards() {
      // 优先导出选中行，否则导出全部
      const wishEmployees = exportSelectedRows.value.length > 0
        ? exportSelectedRows.value
        : finalReviewData.value;
      if (wishEmployees.length === 0) {
        ElementPlus.ElMessage.warning('没有可导出的贺卡');
        return;
      }
      exportCardsLoading.value = true;
      await loadCardBgImage();

      // 创建离屏 canvas
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 2000;
      offCanvas.height = 1056;
      const offCtx = offCanvas.getContext('2d');

      // 生成所有贺卡图片
      const cardImages = [];
      for (let i = 0; i < wishEmployees.length; i++) {
        const emp = wishEmployees[i];
        if (cardBgImage) {
          offCtx.drawImage(cardBgImage, 0, 0, 2000, 1056);
        } else {
          offCtx.fillStyle = '#FDF0E4';
          offCtx.fillRect(0, 0, 2000, 1056);
        }
        const fontSize = 36;
        const lineHeight = 70;
        const maxWidth = 620;

        offCtx.fillStyle = '#5C3D2E';
        offCtx.font = '36px "Microsoft YaHei", sans-serif';
        offCtx.textAlign = 'left';
        offCtx.fillText('亲爱的' + emp.name, 120, 420);

        offCtx.fillStyle = '#6B4C3B';
        offCtx.font = fontSize + 'px "Microsoft YaHei", sans-serif';
        let batchWishText = emp.wish || '';
        if (!batchWishText.includes('祝你生日快乐')) {
          batchWishText = (batchWishText || '').replace(/[\n\s]+$/, '') + '\n祝你生日快乐！';
        }
        const wishLines = wrapText(offCtx, batchWishText, maxWidth);
        let ty = 495;
        wishLines.forEach(line => {
          offCtx.fillText(line, 120, ty);
          ty += lineHeight;
        });

        offCtx.fillStyle = '#5C3D2E';
        offCtx.font = '36px "Microsoft YaHei", sans-serif';
        offCtx.textAlign = 'right';
        offCtx.fillText('银泰温暖团队', 720, 845);
        offCtx.textAlign = 'left';

        // 获取 base64 数据
        const dataUrl = offCanvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        cardImages.push({ name: emp.name + '_生日贺卡.png', data: base64 });
      }

      // 下载逻辑：1张直接下载，2张以上打包为 zip
      if (cardImages.length === 1) {
        const link = document.createElement('a');
        link.download = cardImages[0].name;
        link.href = 'data:image/png;base64,' + cardImages[0].data;
        link.click();
      } else {
        const zip = new JSZip();
        const now = new Date();
        const folderName = '导出' + (now.getMonth() + 1) + '月' + now.getDate() + '日-生日贺卡';
        const folder = zip.folder(folderName);
        cardImages.forEach(img => {
          folder.file(img.name, img.data, { base64: true });
        });
        const blob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.download = folderName + '.zip';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      }

      // 导出后更新状态为已导出，并保存历史记录
      const exportedNames = new Set(wishEmployees.map(e => e.name));
      const exportedRecords = [];
      employees.value.forEach(e => {
        if (exportedNames.has(e.name) && (e.wishStatus === 'approved' || e.wishStatus === 'exported')) {
          e.wishStatus = 'exported';
          exportedRecords.push(JSON.parse(JSON.stringify(e)));
        }
      });

      // 保存导出记录到历史
      const now = new Date();
      const historyRecord = {
        id: 'h' + Date.now(),
        reviewTime: now.toLocaleString('zh-CN'),
        exportDate: now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate(),
        totalCount: exportedRecords.length,
        records: exportedRecords
      };
      reviewHistory.value.unshift(historyRecord);
      saveData();

      // 自动清空员工数据和审核数据
      employees.value = [];
      finalReviewData.value = [];
      exportSelectedRows.value = [];
      exportAllSelected.value = false;
      localStorage.removeItem('bws_employees');
      localStorage.removeItem('bws_finalReviewData');
      localStorage.removeItem('bws_leaderReviewData');
      saveData(); // 再次保存，确保空数组写入 localStorage
      exportCardsLoading.value = false;
      ElementPlus.ElMessage.success(`已导出 ${cardImages.length} 张贺卡，员工数据已自动清空（历史记录可在"审核历史"中查看）`);
    }

    // ===== 文案库选择（领导替换用） =====
    function showWishPicker(emp) {
      currentPickerEmployee.value = emp;
      pickerFilter.gender = emp.gender;
      pickerFilter.season = getSeason(emp.birthMonth);
      showWishPickerDialog.value = true;
    }

    function getPickerWishes() {
      return wishLibrary.value.filter(w => {
        const genderMatch = !pickerFilter.gender || w.gender === pickerFilter.gender || w.gender === 'all';
        const seasonMatch = !pickerFilter.season || w.season === pickerFilter.season || w.season === 'all';
        return genderMatch && seasonMatch;
      }).sort((a, b) => a.usageCount - b.usageCount);
    }

    function replaceFromLibrary(template) {
      const emp = currentPickerEmployee.value;
      if (!emp) return;
      // 只替换文案正文，不带称呼和落款
      emp.wish = template.content;
      template.usageCount++;
      // 同步到 reviewEmployees
      const reviewEmp = reviewEmployees.value.find(e => e.name === emp.name);
      if (reviewEmp) {
        reviewEmp.wish = emp.wish;
        reviewEmp.wishStatus = 'modified';
        reviewEmp.modifySource = '文案库替换';
      }
      saveData();
      showWishPickerDialog.value = false;
      ElementPlus.ElMessage.success('已替换文案');
    }

    // ===== 领导审核 =====
    function loadReviewData() {
      const saved = localStorage.getItem('bws_leaderReviewData');
      if (saved) {
        reviewEmployees.value = JSON.parse(saved);
      } else {
        reviewEmployees.value = [];
      }
      selectedRows.value = [];
      allSelected.value = false;
    }

    function handleSelectionChange(selection) {
      selectedRows.value = selection;
      allSelected.value = selection.length === reviewEmployees.value.length && reviewEmployees.value.length > 0;
    }

    function selectAll() {
      // 通过操作 reviewEmployees 的引用来实现全选/取消
      // Element Plus table 的 toggleAllSelection 方法
      allSelected.value = !allSelected.value;
      // 使用 nextTick 确保 DOM 更新
      nextTick(() => {
        // 通过重新设置数据来触发全选
        if (allSelected.value) {
          selectedRows.value = [...reviewEmployees.value];
        } else {
          selectedRows.value = [];
        }
      });
    }

    function onWishEdit(row) {
      row.wishStatus = 'modified';
      row.modifySource = '手动修改';
    }

    function approveWish(row) {
      row.wishStatus = 'approved';
      if (!row.modifySource) row.modifySource = '直接通过';
      ElementPlus.ElMessage.success('已通过');
    }

    function batchApprove() {
      if (selectedRows.value.length === 0) {
        ElementPlus.ElMessage.warning('请先勾选要通过的文案');
        return;
      }
      selectedRows.value.forEach(row => {
        row.wishStatus = 'approved';
        if (!row.modifySource) row.modifySource = '批量通过';
      });
      ElementPlus.ElMessage.success(`已批量通过 ${selectedRows.value.length} 条文案`);
      selectedRows.value = [];
      allSelected.value = false;
    }

    function completeReview() {
      if (reviewEmployees.value.length === 0) {
        ElementPlus.ElMessage.warning('没有可提交的审核结果');
        return;
      }
      ElementPlus.ElMessageBox.confirm(
        `确认完成审核？未单独标记的文案将全部设为"已通过"。`,
        '确认审核',
        { type: 'warning', confirmButtonText: '确认审核', cancelButtonText: '取消' }
      ).then(() => {
        // 未单独标记的全部设为已通过
        reviewEmployees.value.forEach(row => {
          if (row.wishStatus !== 'approved') {
            row.wishStatus = 'approved';
            if (!row.modifySource) row.modifySource = '审核通过';
          }
        });
        localStorage.setItem('bws_finalReviewData', JSON.stringify(reviewEmployees.value));
        finalReviewData.value = JSON.parse(JSON.stringify(reviewEmployees.value));

        // 自动同步到员工数据，无需管理员手动点击
        let updateCount = 0;
        finalReviewData.value.forEach(review => {
          const emp = employees.value.find(e => e.name === review.name);
          if (emp) {
            emp.wish = review.wish;
            emp.wishStatus = review.wishStatus === 'approved' ? 'approved' : emp.wishStatus;
            emp.modifySource = review.modifySource || '领导审核';
            updateCount++;
          }
        });

        // 保存历史审核记录
        const now = new Date();
        const historyRecord = {
          id: 'h' + Date.now(),
          reviewTime: now.toLocaleString('zh-CN'),
          exportDate: now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate(),
          totalCount: reviewEmployees.value.length,
          records: JSON.parse(JSON.stringify(reviewEmployees.value))
        };
        reviewHistory.value.unshift(historyRecord);

        // 清除待审核缓存，避免重登后仍显示未审核
        localStorage.removeItem('bws_leaderReviewData');
        reviewEmployees.value = [];

        saveData();
        ElementPlus.ElMessage.success(`审核完成！已自动同步 ${updateCount} 条数据，可导出贺卡`);
      }).catch(() => {});
    }

    // ===== 管理员同步 =====
    const hasLeaderReview = computed(() => {
      return finalReviewData.value.length > 0;
    });

    function syncFromLeader() {
      // 已改为自动同步，此函数保留兼容，手动调用时仅刷新 finalReviewData
      const savedFinal = localStorage.getItem('bws_finalReviewData');
      if (savedFinal) {
        finalReviewData.value = JSON.parse(savedFinal);
        ElementPlus.ElMessage.success('审核数据已刷新');
      } else {
        ElementPlus.ElMessage.warning('暂无领导审核结果');
      }
    }

    // 删除历史记录
    function deleteHistoryRecord(id) {
      ElementPlus.ElMessageBox.confirm('确定删除该条历史记录吗？', '提示', { type: 'warning' }).then(() => {
        const idx = reviewHistory.value.findIndex(h => h.id === id);
        if (idx >= 0) {
          reviewHistory.value.splice(idx, 1);
          saveData();
          ElementPlus.ElMessage.success('已删除');
        }
      }).catch(() => {});
    }

    const filteredHistory = computed(() => {
      if (!historyFilter.keyword) return reviewHistory.value;
      return reviewHistory.value.filter(h => {
        return h.reviewTime.includes(historyFilter.keyword) ||
          h.records.some(r => r.name.includes(historyFilter.keyword));
      });
    });

    // ===== Excel 导入导出 =====
    function downloadImportTemplate() {
      const templateData = [
        { '姓名': '张三', '性别': '女', '月份': 3, '日期': 15, '部门': '人力资源部' },
        { '姓名': '李四', '性别': '男', '月份': 7, '日期': 22, '部门': '财务部' },
        { '姓名': '王五', '性别': '女', '月份': 12, '日期': 8, '部门': '运营部' }
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      ws['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 15 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '员工信息');
      XLSX.writeFile(wb, '员工导入模板.xlsx');
      ElementPlus.ElMessage.success('模板已下载，请按格式填写后导入');
    }

    function importEmployees(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          let count = 0;
          json.forEach(row => {
            // 兼容中英文列名
            const name = row['姓名'] || row['name'] || row['Name'];
            if (!name) return;
            const genderText = String(row['性别'] || row['gender'] || row['Gender'] || '女');
            let gender = 'female';
            if (genderText === '男' || genderText === 'male' || genderText === 'Male') gender = 'male';
            else if (genderText === '女' || genderText === 'female' || genderText === 'Female') gender = 'female';
            const birthMonth = parseInt(row['月份'] || row['month'] || row['Month'] || row['生日月份'] || 1);
            const birthDay = parseInt(row['日期'] || row['day'] || row['Day'] || row['生日日期'] || 1);
            const department = row['部门'] || row['department'] || row['Department'] || '';
            const exists = employees.value.find(emp => emp.name === name);
            if (!exists) {
              employees.value.push({
                name, gender, birthMonth: isNaN(birthMonth) ? 1 : birthMonth,
                birthDay: isNaN(birthDay) ? 1 : birthDay,
                department, wish: '', wishStatus: 'pending', modifySource: ''
              });
              count++;
            }
          });
          saveData();
          ElementPlus.ElMessage.success(`导入成功，新增 ${count} 名员工`);
        } catch (err) {
          ElementPlus.ElMessage.error('导入失败：' + err.message);
        }
      };
      reader.readAsArrayBuffer(file.raw);
    }

    function exportEmployees() {
      const data = employees.value.map(e => ({
        '姓名': e.name,
        '性别': e.gender === 'male' ? '男' : '女',
        '月份': e.birthMonth,
        '日期': e.birthDay || 1,
        '部门': e.department || '',
        '文案状态': e.wishStatus === 'exported' ? '已导出' : e.wishStatus === 'approved' ? '已审核' : e.wishStatus === 'generated' ? '已生成' : '未生成'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '员工信息');
      XLSX.writeFile(wb, '员工信息.xlsx');
    }

    function exportWishesExcel() {
      const data = employees.value.filter(e => e.wish).map(e => ({
        '姓名': e.name,
        '性别': e.gender === 'male' ? '男' : '女',
        '月份': e.birthMonth + '月',
        '日期': (e.birthDay || 1) + '日',
        '部门': e.department || '',
        '祝福文案': formatWish(e),
        '状态': e.wishStatus === 'exported' ? '已导出' : e.wishStatus === 'approved' ? '已审核' : e.wishStatus === 'generated' ? '已生成' : '待审核'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 10 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 60 }, { wch: 10 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '生日文案');
      XLSX.writeFile(wb, '生日祝福文案.xlsx');
    }

    function exportWishLibrary() {
      const data = wishLibrary.value.map(w => ({
        '文案内容': w.content,
        '适用性别': w.gender === 'male' ? '男' : w.gender === 'female' ? '女' : '通用',
        '适用季节': w.season === 'spring' ? '春季' : w.season === 'summer' ? '夏季' : w.season === 'autumn' ? '秋季' : w.season === 'winter' ? '冬季' : '通用',
        '标签': w.tags,
        '使用次数': w.usageCount,
        '来源': w.source
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 60 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 10 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '文案库');
      XLSX.writeFile(wb, '文案库.xlsx');
    }

    function importWishLibrary(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          let count = 0;
          json.forEach(row => {
            const content = row['文案内容'] || row['content'];
            if (!content) return;
            const genderText = row['适用性别'] || row['gender'] || '通用';
            const gender = genderText === '男' ? 'male' : genderText === '女' ? 'female' : 'all';
            const seasonText = row['适用季节'] || row['season'] || '通用';
            const seasonMap = { '春季': 'spring', '夏季': 'summer', '秋季': 'autumn', '冬季': 'winter', '通用': 'all' };
            const season = seasonMap[seasonText] || 'all';
            wishLibrary.value.push({
              id: 'w' + Date.now() + '_' + count,
              content,
              gender,
              season,
              tags: row['标签'] || row['tags'] || '',
              usageCount: parseInt(row['使用次数'] || row['usageCount'] || 0),
              source: '历史导入'
            });
            count++;
          });
          saveData();
          ElementPlus.ElMessage.success(`导入成功，新增 ${count} 条文案`);
        } catch (err) {
          ElementPlus.ElMessage.error('导入失败：' + err.message);
        }
      };
      reader.readAsArrayBuffer(file.raw);
    }

    // ===== 导出历史记录 Excel =====
    function exportHistoryExcel() {
      if (reviewHistory.value.length === 0) {
        ElementPlus.ElMessage.warning('暂无历史记录可导出');
        return;
      }
      const allRows = [];
      reviewHistory.value.forEach(h => {
        h.records.forEach(r => {
          allRows.push({
            '导出贺卡日期': h.exportDate || '-',
            '审核时间': h.reviewTime,
            '姓名': r.name,
            '性别': r.gender === 'male' ? '男' : '女',
            '月份': r.birthMonth + '月',
            '日期': (r.birthDay || 1) + '日',
            '部门': r.department || '',
            '祝福文案': r.wish,
            '状态': r.wishStatus === 'approved' ? '已审核' : '待修改',
            '修改方式': r.modifySource || '-'
          });
        });
      });
      const ws = XLSX.utils.json_to_sheet(allRows);
      ws['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 60 }, { wch: 10 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '历史审核记录');
      XLSX.writeFile(wb, '历史审核记录.xlsx');
      ElementPlus.ElMessage.success('历史记录已导出');
    }

    // ===== 文案库导入模板下载 =====
    function downloadWishLibraryTemplate() {
      const templateData = [
        { '文案内容': '愿你的每一天都充满阳光，每一刻都被幸福包围！', '适用性别': '通用', '适用季节': '通用', '标签': '温馨,祝福' },
        { '文案内容': '春风十里，不如你的笑颜。愿新的一岁，花开满路！', '适用性别': '女', '适用季节': '春季', '标签': '诗意,浪漫' },
        { '文案内容': '愿你的热情如夏日般永不消退，事业如阳光般灿烂！', '适用性别': '男', '适用季节': '夏季', '标签': '热情,事业' }
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      ws['!cols'] = [{ wch: 60 }, { wch: 10 }, { wch: 10 }, { wch: 15 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '文案库');
      XLSX.writeFile(wb, '文案库导入模板.xlsx');
      ElementPlus.ElMessage.success('文案库模板已下载');
    }

    return {
      isLoggedIn, currentUserRole, loginLoading, currentPage, loginForm,
      employees, wishLibrary, reviewEmployees, finalReviewData, reviewHistory,
      showAddEmployee, showAddWishTemplate, showCardPreview, showWishPickerDialog,
      editingEmployeeIndex, currentPreviewEmployee, currentPickerEmployee, cardCanvas,
      exportCardsLoading,
      employeeForm, wishTemplateForm,
      libraryFilter, pickerFilter,
      filteredLibrary,
      selectedRows, allSelected,
      exportSelectedRows, exportAllSelected,
      historyFilter, filteredHistory,
      hasLeaderReview,
      handleLogin, handleLogout,
      showAddEmployeeDialog, editEmployee, saveEmployee, deleteEmployee,
      batchGenerateWishes, regenerateWish,
      saveWishTemplate, deleteWishTemplate, filterLibrary,
      previewCard, downloadCard, exportAllCards,
      handleExportSelectionChange, toggleExportSelectAll,
      showWishPicker, getPickerWishes, replaceFromLibrary,
      submitToLeader,
      loadReviewData, handleSelectionChange, selectAll,
      onWishEdit, completeReview,
      syncFromLeader, deleteHistoryRecord, exportHistoryExcel,
      downloadImportTemplate, downloadWishLibraryTemplate,
      importEmployees, exportEmployees,
      exportWishesExcel,
      exportWishLibrary, importWishLibrary,
      saveData,
      syncStatus
    };
  }
});

app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
app.mount('#app');
