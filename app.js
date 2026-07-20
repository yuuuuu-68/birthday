const { createApp, ref, reactive, computed, onMounted, nextTick } = Vue;

const app = createApp({
  setup() {
    // ===== 状态管理 =====
    const isLoggedIn = ref(false);
    const currentUserRole = ref('');
    const loginLoading = ref(false);
    const currentPage = ref('dashboard');
    const loginForm = reactive({ role: 'admin', password: '' });

    // 默认密码
    const DEFAULT_PASSWORDS = { admin: 'admin123', leader: 'leader123' };

    // 数据
    const employees = ref([]);
    const wishLibrary = ref([]);
    const reviewEmployees = ref([]);

    // 弹窗状态
    const showAddEmployee = ref(false);
    const showAddWishTemplate = ref(false);
    const showCardPreview = ref(false);
    const showWishPickerDialog = ref(false);
    const editingEmployeeIndex = ref(-1);
    const currentPreviewEmployee = ref(null);
    const currentPickerEmployee = ref(null);
    const cardCanvas = ref(null);

    // 表单
    const employeeForm = reactive({ name: '', gender: 'female', birthMonth: 1, department: '' });
    const wishTemplateForm = reactive({ content: '', gender: 'all', season: 'all', tags: '' });

    // 筛选
    const libraryFilter = reactive({ gender: '', season: '', keyword: '' });
    const pickerFilter = reactive({ gender: '', season: '' });

    // ===== 初始化 =====
    onMounted(() => {
      loadData();
      if (wishLibrary.value.length === 0) {
        wishLibrary.value = JSON.parse(JSON.stringify(DEFAULT_WISH_LIBRARY));
        saveData();
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
    }

    // ===== 员工管理 =====
    function showAddEmployeeDialog() {
      editingEmployeeIndex.value = -1;
      Object.assign(employeeForm, { name: '', gender: 'female', birthMonth: 1, department: '' });
      showAddEmployee.value = true;
    }

    function editEmployee(index) {
      editingEmployeeIndex.value = index;
      const emp = employees.value[index];
      Object.assign(employeeForm, { name: emp.name, gender: emp.gender, birthMonth: emp.birthMonth, department: emp.department || '' });
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
      ElementPlus.ElMessageBox.confirm('确定删除该员工？', '提示', { type: 'warning' }).then(() => {
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
      // 筛选匹配的文案：性别匹配 + 季节匹配（或通用）
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
      // 优先选择使用次数少的
      candidates.sort((a, b) => a.usageCount - b.usageCount);
      // 从前50%中随机选
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

    // ===== 文案库管理 =====
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

    // ===== 贺卡生成 (Canvas) =====
    function previewCard(emp) {
      currentPreviewEmployee.value = emp;
      showCardPreview.value = true;
      nextTick(() => {
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

      // 背景色 - 暖橙色
      ctx.fillStyle = '#FDF0E4';
      ctx.fillRect(0, 0, W, H);

      // 左侧白色卡片区域
      ctx.fillStyle = '#FFFDF8';
      roundRect(ctx, 40, 40, 820, 1000, 30);
      ctx.fill();

      // HAPPY BIRTHDAY 标题
      ctx.fillStyle = '#E8734A';
      ctx.font = 'bold 72px Arial';
      ctx.fillText('HAPPY', 80, 140);
      ctx.fillText('BIRTHDAY', 80, 220);

      // 生日快乐
      ctx.fillStyle = '#E8734A';
      ctx.font = '36px "Microsoft YaHei", sans-serif';
      ctx.fillText('生日快乐', 80, 280);

      // 分隔线
      ctx.strokeStyle = '#F0D5C0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, 310);
      ctx.lineTo(400, 310);
      ctx.stroke();

      // 亲爱的 XXX
      ctx.fillStyle = '#5C3D2E';
      ctx.font = '32px "Microsoft YaHei", sans-serif';
      ctx.fillText(`亲爱的${emp.name}`, 80, 380);

      // 文案内容 - 自动换行
      ctx.fillStyle = '#6B4C3B';
      ctx.font = '28px "Microsoft YaHei", sans-serif';
      const wishLines = wrapText(ctx, emp.wish || '祝你生日快乐！', 700, 80);
      let y = 440;
      wishLines.forEach(line => {
        ctx.fillText(line, 80, y);
        y += 48;
      });

      // 银泰温暖团队
      ctx.fillStyle = '#5C3D2E';
      ctx.font = '28px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('银泰温暖团队', 780, 980);
      ctx.textAlign = 'left';

      // 右侧装饰区域 - 模拟蛋糕和礼物
      // 大圆形背景
      ctx.fillStyle = '#F5E6D3';
      ctx.beginPath();
      ctx.arc(1300, 500, 420, 0, Math.PI * 2);
      ctx.fill();

      // 蛋糕
      drawCake(ctx, 1100, 380);

      // 礼物盒
      drawGift(ctx, 1500, 600, '#E8734A');
      drawGift(ctx, 1620, 650, '#7BA7BC');

      // 气球
      drawBalloon(ctx, 1650, 200, '#E8734A');
      drawBalloon(ctx, 1750, 280, '#7BA7BC');
      drawBalloon(ctx, 1580, 150, '#F5C842');

      // 花朵装饰
      drawFlower(ctx, 900, 250, '#F5C842');
      drawFlower(ctx, 950, 350, '#E8734A');

      // 二维码区域
      ctx.fillStyle = '#FFF';
      roundRect(ctx, 80, 920, 120, 120, 8);
      ctx.fill();
      ctx.strokeStyle = '#DDD';
      ctx.lineWidth = 1;
      roundRect(ctx, 80, 920, 120, 120, 8);
      ctx.stroke();
      // 模拟二维码
      ctx.fillStyle = '#333';
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          if (Math.random() > 0.4) {
            ctx.fillRect(90 + i * 12, 930 + j * 12, 10, 10);
          }
        }
      }
      ctx.fillStyle = '#999';
      ctx.font = '16px "Microsoft YaHei", sans-serif';
      ctx.fillText('微信扫一扫', 210, 970);
      ctx.fillText('领取专属生日礼', 210, 995);
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

    function wrapText(ctx, text, maxWidth, _padding) {
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

    function drawCake(ctx, x, y) {
      // 蛋糕底层
      ctx.fillStyle = '#FFF5EE';
      roundRect(ctx, x, y + 120, 280, 80, 10);
      ctx.fill();
      ctx.strokeStyle = '#F0D5C0';
      ctx.lineWidth = 2;
      roundRect(ctx, x, y + 120, 280, 80, 10);
      ctx.stroke();
      // 蛋糕中层
      ctx.fillStyle = '#FFE4D6';
      roundRect(ctx, x + 20, y + 50, 240, 80, 10);
      ctx.fill();
      ctx.strokeStyle = '#F0D5C0';
      roundRect(ctx, x + 20, y + 50, 240, 80, 10);
      ctx.stroke();
      // 蛋糕顶层
      ctx.fillStyle = '#FFF';
      roundRect(ctx, x + 40, y, 200, 60, 10);
      ctx.fill();
      ctx.strokeStyle = '#F0D5C0';
      roundRect(ctx, x + 40, y, 200, 60, 10);
      ctx.stroke();
      // 奶油装饰
      ctx.fillStyle = '#FFB6C1';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(x + 60 + i * 35, y + 55, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      // 蜡烛
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(x + 130, y - 40, 12, 45);
      // 火焰
      ctx.fillStyle = '#FF6B35';
      ctx.beginPath();
      ctx.ellipse(x + 136, y - 50, 10, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.ellipse(x + 136, y - 48, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawGift(ctx, x, y, color) {
      ctx.fillStyle = color;
      roundRect(ctx, x, y, 100, 80, 8);
      ctx.fill();
      // 丝带
      ctx.fillStyle = '#FFF';
      ctx.fillRect(x + 45, y, 10, 80);
      ctx.fillRect(x, y + 35, 100, 10);
      // 蝴蝶结
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.ellipse(x + 50, y - 5, 20, 12, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 50, y - 5, 20, 12, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawBalloon(ctx, x, y, color) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(x, y, 30, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // 线
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y + 40);
      ctx.quadraticCurveTo(x + 10, y + 80, x - 5, y + 120);
      ctx.stroke();
    }

    function drawFlower(ctx, x, y, color) {
      ctx.fillStyle = color;
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72) * Math.PI / 180;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(angle) * 15, y + Math.sin(angle) * 15, 12, 8, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    function downloadCard() {
      const canvas = cardCanvas.value;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${currentPreviewEmployee.value.name}_生日贺卡.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
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
      // 在 reviewEmployees 中也更新
      const reviewEmp = reviewEmployees.value.find(e => e.name === emp.name);
      if (reviewEmp) {
        reviewEmp.wish = emp.wish;
      }
      saveData();
      showWishPickerDialog.value = false;
      ElementPlus.ElMessage.success('已替换文案');
    }

    // ===== 领导审核 =====
    function onWishEdit(row) {
      row.wishStatus = 'modified';
      row.modifySource = '手动修改';
      saveData();
    }

    function approveWish(row) {
      row.wishStatus = 'approved';
      if (!row.modifySource) row.modifySource = '已通过';
      saveData();
      ElementPlus.ElMessage.success('已通过');
    }

    // ===== Excel 导入导出 =====
    function importEmployees(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          json.forEach(row => {
            const name = row['姓名'] || row['name'];
            if (!name) return;
            const genderText = row['性别'] || row['gender'] || '女';
            const gender = genderText === '男' ? 'male' : 'female';
            const birthMonth = parseInt(row['生日月份'] || row['birthMonth'] || row['月份'] || 1);
            const department = row['部门'] || row['department'] || '';
            // 检查是否已存在
            const exists = employees.value.find(e => e.name === name);
            if (!exists) {
              employees.value.push({ name, gender, birthMonth, department, wish: '', wishStatus: 'pending', modifySource: '' });
            }
          });
          saveData();
          ElementPlus.ElMessage.success(`导入成功，共导入 ${json.length} 条`);
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
        '生日月份': e.birthMonth,
        '部门': e.department || '',
        '文案状态': e.wishStatus === 'approved' ? '已通过' : e.wishStatus === 'modified' ? '已修改' : '待生成'
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
        '生日月份': e.birthMonth + '月',
        '部门': e.department || '',
        '祝福文案': e.wish,
        '状态': e.wishStatus === 'approved' ? '已通过' : '待审核'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      // 设置列宽
      ws['!cols'] = [{ wch: 10 }, { wch: 6 }, { wch: 10 }, { wch: 15 }, { wch: 60 }, { wch: 10 }];
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
          ElementPlus.ElMessage.success(`导入成功，共导入 ${count} 条文案`);
        } catch (err) {
          ElementPlus.ElMessage.error('导入失败：' + err.message);
        }
      };
      reader.readAsArrayBuffer(file.raw);
    }

    // 领导导入文案
    function importWishesForReview(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          reviewEmployees.value = json.map(row => {
            const genderText = row['性别'] || '女';
            return {
              name: row['姓名'] || row['name'],
              gender: genderText === '男' ? 'male' : 'female',
              birthMonth: parseInt(row['生日月份'] || 1),
              department: row['部门'] || '',
              wish: row['祝福文案'] || row['wish'] || row['文案'] || '',
              wishStatus: 'pending',
              modifySource: ''
            };
          }).filter(e => e.name && e.wish);
          ElementPlus.ElMessage.success(`导入成功，共 ${reviewEmployees.value.length} 条文案待审核`);
        } catch (err) {
          ElementPlus.ElMessage.error('导入失败：' + err.message);
        }
      };
      reader.readAsArrayBuffer(file.raw);
    }

    function exportReviewResult() {
      const data = reviewEmployees.value.map(e => ({
        '姓名': e.name,
        '性别': e.gender === 'male' ? '男' : '女',
        '生日月份': e.birthMonth + '月',
        '部门': e.department || '',
        '祝福文案': e.wish,
        '状态': e.wishStatus === 'approved' ? '已通过' : '需修改',
        '修改方式': e.modifySource || ''
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 10 }, { wch: 6 }, { wch: 10 }, { wch: 15 }, { wch: 60 }, { wch: 10 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '审核结果');
      XLSX.writeFile(wb, '领导审核结果.xlsx');
    }

    // 管理员导入领导审核结果
    function importLeaderReview(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          let updateCount = 0;
          json.forEach(row => {
            const name = row['姓名'] || row['name'];
            const emp = employees.value.find(e => e.name === name);
            if (emp && row['祝福文案']) {
              emp.wish = row['祝福文案'];
              emp.wishStatus = row['状态'] === '已通过' ? 'approved' : 'modified';
              emp.modifySource = row['修改方式'] || '领导修改';
              updateCount++;
            }
          });
          saveData();
          ElementPlus.ElMessage.success(`同步成功，更新 ${updateCount} 条文案`);
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
        '生日月份': e.birthMonth + '月',
        '部门': e.department || '',
        '祝福文案': e.wish,
        '状态': e.wishStatus === 'approved' ? '已通过' : e.wishStatus === 'modified' ? '领导已修改' : '待审核',
        '修改方式': e.modifySource || '-'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 10 }, { wch: 6 }, { wch: 10 }, { wch: 15 }, { wch: 60 }, { wch: 12 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '最终文案');
      XLSX.writeFile(wb, '最终版生日文案.xlsx');
    }

    return {
      isLoggedIn, currentUserRole, loginLoading, currentPage, loginForm,
      employees, wishLibrary, reviewEmployees,
      showAddEmployee, showAddWishTemplate, showCardPreview, showWishPickerDialog,
      editingEmployeeIndex, currentPreviewEmployee, currentPickerEmployee, cardCanvas,
      employeeForm, wishTemplateForm,
      libraryFilter, pickerFilter,
      filteredLibrary,
      handleLogin, handleLogout,
      showAddEmployeeDialog, editEmployee, saveEmployee, deleteEmployee,
      batchGenerateWishes, regenerateWish,
      saveWishTemplate, deleteWishTemplate, filterLibrary,
      previewCard, downloadCard,
      showWishPicker, getPickerWishes, replaceFromLibrary,
      onWishEdit, approveWish,
      importEmployees, exportEmployees,
      exportWishesExcel,
      exportWishLibrary, importWishLibrary,
      importWishesForReview, exportReviewResult,
      importLeaderReview, exportFinalExcel,
      saveData
    };
  }
});

app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
app.mount('#app');
