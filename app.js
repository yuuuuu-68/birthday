const { createApp, ref, reactive, computed, onMounted, nextTick } = Vue;

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

    // ===== 初始化 =====
    onMounted(() => {
      loadData();
      if (wishLibrary.value.length === 0) {
        wishLibrary.value = JSON.parse(JSON.stringify(DEFAULT_WISH_LIBRARY));
        saveData();
      }
      // 领导登录时自动加载审核数据
      if (isLoggedIn.value && currentUserRole.value === 'leader') {
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
      } catch (e) {
        console.error('加载数据失败', e);
      }
    }

    function saveData() {
      try {
        localStorage.setItem('bws_employees', JSON.stringify(employees.value));
        localStorage.setItem('bws_wishLibrary', JSON.stringify(wishLibrary.value));
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
      return `亲爱的${emp.name}\n\n${selected.content}\n\n祝你生日快乐！\n\n银泰温暖团队`;
    }

    function batchGenerateWishes() {
      let count = 0;
      employees.value.forEach(emp => {
        if (!emp.wish || emp.wishStatus === 'pending') {
          emp.wish = generateWishForEmployee(emp);
          emp.wishStatus = 'pending';
          count++;
        }
      });
      saveData();
      ElementPlus.ElMessage.success(`已为 ${count} 位员工生成文案`);
    }

    function regenerateWish(emp) {
      emp.wish = generateWishForEmployee(emp);
      emp.wishStatus = 'pending';
      saveData();
      ElementPlus.ElMessage.success('已重新生成');
    }

    // ===== 提交给领导 =====
    function submitToLeader() {
      const wishEmployees = employees.value.filter(e => e.wish);
      if (wishEmployees.length === 0) {
        ElementPlus.ElMessage.warning('没有可提交的文案');
        return;
      }
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
    function loadCardBgImage() {
      return new Promise((resolve) => {
        if (cardBgImage && cardBgImage.complete) { resolve(cardBgImage); return; }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { cardBgImage = img; resolve(img); };
        img.onerror = () => { resolve(null); };
        img.src = './card-bg.png';
      });
    }

    function previewCard(emp) {
      currentPreviewEmployee.value = emp;
      showCardPreview.value = true;
      nextTick(async () => {
        await loadCardBgImage();
        drawCard(emp);
      });
    }

    function drawCard(emp) {
      const canvas = cardCanvas.value;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = 1920, H = 1080;
      canvas.width = W;
      canvas.height = H;

      // 先绘制背景图
      if (cardBgImage) {
        ctx.drawImage(cardBgImage, 0, 0, W, H);
      } else {
        // 备用：纯色背景
        ctx.fillStyle = '#FDF0E4';
        ctx.fillRect(0, 0, W, H);
      }

      // 在左侧空白区域叠加文字
      // 根据背景图，左侧白色区域大约在 x:80-820, y:80-1000
      const textX = 100;
      let textY = 200;

      // 称呼
      ctx.fillStyle = '#5C3D2E';
      ctx.font = 'bold 36px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`亲爱的 ${emp.name}`, textX, textY);
      textY += 60;

      // 文案正文 - 自动换行
      ctx.fillStyle = '#6B4C3B';
      ctx.font = '28px "Microsoft YaHei", sans-serif';
      const wishText = emp.wish || '祝你生日快乐！';
      const wishLines = wrapText(ctx, wishText, 680);
      wishLines.forEach(line => {
        ctx.fillText(line, textX, textY);
        textY += 46;
      });

      // 落款
      textY += 20;
      ctx.fillStyle = '#5C3D2E';
      ctx.font = '28px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('银泰温暖团队', 800, textY);
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

    // 一键导出所有贺卡
    async function exportAllCards() {
      const wishEmployees = employees.value.filter(e => e.wish);
      if (wishEmployees.length === 0) {
        ElementPlus.ElMessage.warning('没有可导出的贺卡');
        return;
      }
      exportCardsLoading.value = true;
      await loadCardBgImage();

      // 创建离屏 canvas
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 1920;
      offCanvas.height = 1080;
      const offCtx = offCanvas.getContext('2d');

      for (let i = 0; i < wishEmployees.length; i++) {
        const emp = wishEmployees[i];
        // 绘制背景
        if (cardBgImage) {
          offCtx.drawImage(cardBgImage, 0, 0, 1920, 1080);
        } else {
          offCtx.fillStyle = '#FDF0E4';
          offCtx.fillRect(0, 0, 1920, 1080);
        }
        // 叠加文字
        const textX = 100;
        let textY = 200;
        offCtx.fillStyle = '#5C3D2E';
        offCtx.font = 'bold 36px "Microsoft YaHei", sans-serif';
        offCtx.textAlign = 'left';
        offCtx.fillText(`亲爱的 ${emp.name}`, textX, textY);
        textY += 60;
        offCtx.fillStyle = '#6B4C3B';
        offCtx.font = '28px "Microsoft YaHei", sans-serif';
        const wishLines = wrapText(offCtx, emp.wish, 680);
        wishLines.forEach(line => {
          offCtx.fillText(line, textX, textY);
          textY += 46;
        });
        textY += 20;
        offCtx.fillStyle = '#5C3D2E';
        offCtx.font = '28px "Microsoft YaHei", sans-serif';
        offCtx.textAlign = 'right';
        offCtx.fillText('银泰温暖团队', 800, textY);
        offCtx.textAlign = 'left';

        // 下载
        const link = document.createElement('a');
        link.download = `${emp.name}_生日贺卡.png`;
        link.href = offCanvas.toDataURL('image/png');
        link.click();

        // 间隔一下避免浏览器阻止
        await new Promise(r => setTimeout(r, 300));
      }
      exportCardsLoading.value = false;
      ElementPlus.ElMessage.success(`已导出 ${wishEmployees.length} 张贺卡`);
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
      emp.wish = `亲爱的${emp.name}\n\n${template.content}\n\n祝你生日快乐！\n\n银泰温暖团队`;
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
      localStorage.setItem('bws_finalReviewData', JSON.stringify(reviewEmployees.value));
      finalReviewData.value = JSON.parse(JSON.stringify(reviewEmployees.value));
      ElementPlus.ElMessage.success('审核完成，管理员可在同步页查看结果');
    }

    // ===== 管理员同步 =====
    const hasLeaderReview = computed(() => {
      return finalReviewData.value.length > 0;
    });

    function syncFromLeader() {
      if (finalReviewData.value.length === 0) {
        ElementPlus.ElMessage.warning('没有领导审核结果可同步');
        return;
      }
      let updateCount = 0;
      finalReviewData.value.forEach(review => {
        const emp = employees.value.find(e => e.name === review.name);
        if (emp) {
          emp.wish = review.wish;
          emp.wishStatus = review.wishStatus === 'approved' ? 'approved' : 'modified';
          emp.modifySource = review.modifySource || '领导审核';
          updateCount++;
        }
      });
      saveData();
      ElementPlus.ElMessage.success(`已同步 ${updateCount} 条审核结果`);
    }

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
        '文案状态': e.wishStatus === 'approved' ? '已通过' : e.wishStatus === 'modified' ? '待修改' : '未生成'
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
        '祝福文案': e.wish,
        '状态': e.wishStatus === 'approved' ? '已通过' : '待审核'
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

    function exportFinalExcel() {
      const data = employees.value.filter(e => e.wish).map(e => ({
        '姓名': e.name,
        '性别': e.gender === 'male' ? '男' : '女',
        '月份': e.birthMonth + '月',
        '日期': (e.birthDay || 1) + '日',
        '部门': e.department || '',
        '祝福文案': e.wish,
        '状态': e.wishStatus === 'approved' ? '已通过' : e.wishStatus === 'modified' ? '领导待修改' : '待审核',
        '修改方式': e.modifySource || '-'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 10 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 60 }, { wch: 12 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '最终文案');
      XLSX.writeFile(wb, '最终版生日文案.xlsx');
    }

    return {
      isLoggedIn, currentUserRole, loginLoading, currentPage, loginForm,
      employees, wishLibrary, reviewEmployees, finalReviewData,
      showAddEmployee, showAddWishTemplate, showCardPreview, showWishPickerDialog,
      editingEmployeeIndex, currentPreviewEmployee, currentPickerEmployee, cardCanvas,
      exportCardsLoading,
      employeeForm, wishTemplateForm,
      libraryFilter, pickerFilter,
      filteredLibrary,
      selectedRows, allSelected,
      hasLeaderReview,
      handleLogin, handleLogout,
      showAddEmployeeDialog, editEmployee, saveEmployee, deleteEmployee,
      batchGenerateWishes, regenerateWish,
      saveWishTemplate, deleteWishTemplate, filterLibrary,
      previewCard, downloadCard, exportAllCards,
      showWishPicker, getPickerWishes, replaceFromLibrary,
      submitToLeader,
      loadReviewData, handleSelectionChange, selectAll,
      onWishEdit, approveWish, batchApprove, completeReview,
      syncFromLeader,
      downloadImportTemplate,
      importEmployees, exportEmployees,
      exportWishesExcel,
      exportWishLibrary, importWishLibrary,
      exportFinalExcel,
      saveData
    };
  }
});

app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
app.mount('#app');
