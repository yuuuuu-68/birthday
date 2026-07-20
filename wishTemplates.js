// 初始文案库 - 按性别 x 季节分类
// 每条文案不含姓名和落款，生成时自动拼接

const DEFAULT_WISH_LIBRARY = [
  // ===== 女性 - 春季 =====
  { id: 'w001', content: '愿你的生日如诗如画，愿你的生活如歌如舞。愿你在这特别的日子里，感受到满满的幸福与喜悦！', gender: 'female', season: 'spring', tags: '诗意,温馨', usageCount: 0, source: '系统预设' },
  { id: 'w002', content: '春风十里，不如你的笑颜。愿新的一岁，花开满路，幸福常伴，所有美好都如期而至！', gender: 'female', season: 'spring', tags: '诗意,浪漫', usageCount: 0, source: '系统预设' },
  { id: 'w003', content: '三月的风，四月的雨，都不如生日这天最好的你。愿你如花般绽放，如阳光般温暖！', gender: 'female', season: 'spring', tags: '温馨,自然', usageCount: 0, source: '系统预设' },
  { id: 'w004', content: '春暖花开的季节，迎来了最特别的你。愿新的一岁，所有期待都能开花结果，所有梦想都能如愿以偿！', gender: 'female', season: 'spring', tags: '温馨,励志', usageCount: 0, source: '系统预设' },
  { id: 'w005', content: '愿你像春天的花朵一样，永远绽放最美的笑容，愿每一天都充满阳光和希望！', gender: 'female', season: 'spring', tags: '温馨,阳光', usageCount: 0, source: '系统预设' },

  // ===== 女性 - 夏季 =====
  { id: 'w006', content: '盛夏的阳光，不及你笑容的万分之一。愿新的一岁，热情似火，生活如夏花般绚烂！', gender: 'female', season: 'summer', tags: '热情,浪漫', usageCount: 0, source: '系统预设' },
  { id: 'w007', content: '愿你的日子有糖，岁月有光，眼里有笑意，心中有梦想，一路繁花相送！', gender: 'female', season: 'summer', tags: '温馨,诗意', usageCount: 0, source: '系统预设' },
  { id: 'w008', content: '夏日炎炎，你是最清凉的那一抹风景。愿新的一岁，清爽自在，快乐无边！', gender: 'female', season: 'summer', tags: '清新,温馨', usageCount: 0, source: '系统预设' },
  { id: 'w009', content: '愿所有的美好都如夏日的星空，璀璨而永恒，愿你永远闪耀！', gender: 'female', season: 'summer', tags: '浪漫,诗意', usageCount: 0, source: '系统预设' },
  { id: 'w010', content: '在这个热烈的季节里，愿你收获热烈的幸福。愿每一天都如夏日般充满活力与希望！', gender: 'female', season: 'summer', tags: '活力,温馨', usageCount: 0, source: '系统预设' },

  // ===== 女性 - 秋季 =====
  { id: 'w011', content: '金秋送爽，硕果累累。愿新的一岁，收获满满，幸福如秋叶般静美！', gender: 'female', season: 'autumn', tags: '温馨,收获', usageCount: 0, source: '系统预设' },
  { id: 'w012', content: '秋风起，落叶舞，愿你的生日如秋日般温柔而丰盈。所有的美好，都在这季节里与你相遇！', gender: 'female', season: 'autumn', tags: '温柔,诗意', usageCount: 0, source: '系统预设' },
  { id: 'w013', content: '愿你的生活如秋天的果实，甜美而充实。每一天的努力，都能收获满满的回报！', gender: 'female', season: 'autumn', tags: '励志,温馨', usageCount: 0, source: '系统预设' },
  { id: 'w014', content: '秋高气爽的日子里，愿你的心情也如这天空般明朗，愿幸福与你同行！', gender: 'female', season: 'autumn', tags: '清新,温馨', usageCount: 0, source: '系统预设' },
  { id: 'w015', content: '愿你的每一天都如秋日暖阳，温暖而不炙热，明亮而不刺眼。', gender: 'female', season: 'autumn', tags: '温暖,诗意', usageCount: 0, source: '系统预设' },

  // ===== 女性 - 冬季 =====
  { id: 'w016', content: '冬日虽寒，但有你的地方就是春天。愿新的一岁，温暖如春，幸福常在！', gender: 'female', season: 'winter', tags: '温暖,温馨', usageCount: 0, source: '系统预设' },
  { id: 'w017', content: '愿所有的快乐、所有的幸福、所有的温馨、所有的好运都永远围绕在你的身边！', gender: 'female', season: 'winter', tags: '温馨,祝福', usageCount: 0, source: '系统预设' },
  { id: 'w018', content: '雪花纷飞的季节，愿你的生日如炉火般温暖。新的一年，愿你被世界温柔以待！', gender: 'female', season: 'winter', tags: '温暖,浪漫', usageCount: 0, source: '系统预设' },
  { id: 'w019', content: '岁末年初，万象更新。愿新的一岁，所有遗憾都是惊喜的铺垫，所有等待都不被辜负！', gender: 'female', season: 'winter', tags: '励志,温馨', usageCount: 0, source: '系统预设' },
  { id: 'w020', content: '愿你在寒冷的冬天里，永远有人为你暖手，愿你被爱包围！', gender: 'female', season: 'winter', tags: '温暖,浪漫', usageCount: 0, source: '系统预设' },

  // ===== 男性 - 春季 =====
  { id: 'w021', content: '愿你在往后的日子里，不慌不忙，向阳生长，认真生活，快乐发光。既有柴米油盐的踏实温暖，也有诗和远方的浪漫可期！', gender: 'male', season: 'spring', tags: '励志,踏实', usageCount: 0, source: '系统预设' },
  { id: 'w022', content: '春风得意马蹄疾，愿新的一岁事业蒸蒸日上，生活步步高升。', gender: 'male', season: 'spring', tags: '事业,励志', usageCount: 0, source: '系统预设' },
  { id: 'w023', content: '万物复苏的季节，愿你也迎来新的突破与成长。愿每一分努力都有回报，每一次坚持都有意义！', gender: 'male', season: 'spring', tags: '励志,成长', usageCount: 0, source: '系统预设' },
  { id: 'w024', content: '愿你如春天的树木，扎根深厚，枝繁叶茂。事业有成，家庭幸福。', gender: 'male', season: 'spring', tags: '事业,温馨', usageCount: 0, source: '系统预设' },
  { id: 'w025', content: '新的一年，新的起点。愿你乘风破浪，勇往直前，在人生的道路上书写更精彩的篇章！', gender: 'male', season: 'spring', tags: '励志,事业', usageCount: 0, source: '系统预设' },

  // ===== 男性 - 夏季 =====
  { id: 'w026', content: '盛夏时节，愿你如骄阳般炽热，如大树般挺拔。事业红火，生活精彩。', gender: 'male', season: 'summer', tags: '事业,热情', usageCount: 0, source: '系统预设' },
  { id: 'w027', content: '愿你的热情如夏日般永不消退，愿你的事业如阳光般灿烂辉煌。新的一岁，继续加油！', gender: 'male', season: 'summer', tags: '热情,事业', usageCount: 0, source: '系统预设' },
  { id: 'w028', content: '夏日炎炎，挡不住你前进的脚步。愿新的一岁，披荆斩棘，所向披靡，成就更好的自己！', gender: 'male', season: 'summer', tags: '励志,拼搏', usageCount: 0, source: '系统预设' },
  { id: 'w029', content: '愿你的生活如夏日的啤酒，清爽畅快；愿你的事业如夏日的阳光，热烈耀眼！', gender: 'male', season: 'summer', tags: '热情,洒脱', usageCount: 0, source: '系统预设' },
  { id: 'w030', content: '在这个充满活力的季节，愿你保持初心，勇往直前，愿你永远年轻永远热泪盈眶！', gender: 'male', season: 'summer', tags: '励志,热情', usageCount: 0, source: '系统预设' },

  // ===== 男性 - 秋季 =====
  { id: 'w031', content: '金秋时节，愿你收获一年的辛勤与汗水。事业丰收，家庭美满。', gender: 'male', season: 'autumn', tags: '收获,事业', usageCount: 0, source: '系统预设' },
  { id: 'w032', content: '秋高气爽，正是奋斗好时节。愿新的一岁，百尺竿头更进一步，前程似锦！', gender: 'male', season: 'autumn', tags: '励志,事业', usageCount: 0, source: '系统预设' },
  { id: 'w033', content: '愿你的付出如秋天的果实，颗粒归仓；愿你的努力如秋日的阳光，温暖而有力！', gender: 'male', season: 'autumn', tags: '踏实,收获', usageCount: 0, source: '系统预设' },
  { id: 'w034', content: '岁月沉淀，智慧增长。愿新的一岁，更加成熟稳重，事业更上一层楼！', gender: 'male', season: 'autumn', tags: '成熟,事业', usageCount: 0, source: '系统预设' },
  { id: 'w035', content: '秋风送爽，愿你的心情也如这秋日般爽朗。工作顺利，生活如意。', gender: 'male', season: 'autumn', tags: '洒脱,温馨', usageCount: 0, source: '系统预设' },

  // ===== 男性 - 冬季 =====
  { id: 'w036', content: '岁寒知松柏，患难见真情。愿新的一岁，坚韧如松，温暖如阳。', gender: 'male', season: 'winter', tags: '坚韧,温暖', usageCount: 0, source: '系统预设' },
  { id: 'w037', content: '冬日虽冷，但你的热情从未减退。愿新的一岁，继续保持这份热忱，创造更多可能！', gender: 'male', season: 'winter', tags: '热情,励志', usageCount: 0, source: '系统预设' },
  { id: 'w038', content: '年末岁尾，回顾一年的收获与成长。愿新的一年，再创辉煌，前程万里！', gender: 'male', season: 'winter', tags: '事业,励志', usageCount: 0, source: '系统预设' },
  { id: 'w039', content: '愿你在寒冬中依然保持温暖的心，在挑战中依然保持坚定的信念，强者！', gender: 'male', season: 'winter', tags: '坚韧,励志', usageCount: 0, source: '系统预设' },
  { id: 'w040', content: '新的一年即将开始，愿你带着满满的能量和信心，迎接每一个挑战。', gender: 'male', season: 'winter', tags: '励志,信心', usageCount: 0, source: '系统预设' },

  // ===== 通用 - 春季 =====
  { id: 'w041', content: '春风拂面，万物更新。愿新的一岁，所有美好都如约而至，所有期待都不被辜负！', gender: 'all', season: 'spring', tags: '温馨,通用', usageCount: 0, source: '系统预设' },
  { id: 'w042', content: '在这个充满希望的季节，愿你的生日带来新的开始。愿每一天都充满阳光，每一步都走向幸福！', gender: 'all', season: 'spring', tags: '希望,温馨', usageCount: 0, source: '系统预设' },

  // ===== 通用 - 夏季 =====
  { id: 'w043', content: '愿你的生命如夏花般绚烂，愿你的笑容如阳光般灿烂，愿你永远快乐！', gender: 'all', season: 'summer', tags: '阳光,快乐', usageCount: 0, source: '系统预设' },
  { id: 'w044', content: '夏日的美好，不及你万分之一。愿新的一岁，精彩不断，惊喜连连！', gender: 'all', season: 'summer', tags: '精彩,祝福', usageCount: 0, source: '系统预设' },

  // ===== 通用 - 秋季 =====
  { id: 'w045', content: '秋天是收获的季节，愿你收获健康、收获快乐、收获幸福。', gender: 'all', season: 'autumn', tags: '收获,祝福', usageCount: 0, source: '系统预设' },
  { id: 'w046', content: '愿你的生活如秋天的天空，高远而澄澈；愿你的心情如秋天的微风，清爽而舒适！', gender: 'all', season: 'autumn', tags: '清新,温馨', usageCount: 0, source: '系统预设' },

  // ===== 通用 - 冬季 =====
  { id: 'w047', content: '愿新的一年，所有的遗憾都是惊喜的铺垫，所有的等待都不被辜负。', gender: 'all', season: 'winter', tags: '希望,温馨', usageCount: 0, source: '系统预设' },
  { id: 'w048', content: '岁末年初，辞旧迎新。愿新的一岁，平安喜乐，万事顺遂。', gender: 'all', season: 'winter', tags: '祝福,温馨', usageCount: 0, source: '系统预设' },

  // ===== 通用 - 全季节 =====
  { id: 'w049', content: '愿你的每一天都充满阳光，每一刻都被幸福包围，愿你永远开心！', gender: 'all', season: 'all', tags: '通用,祝福', usageCount: 0, source: '系统预设' },
  { id: 'w050', content: '时光荏苒，岁月如歌。愿新的一岁，比过去更精彩，比未来更值得期待！', gender: 'all', season: 'all', tags: '通用,诗意', usageCount: 0, source: '系统预设' },
  { id: 'w051', content: '愿你眼里有光，心中有爱，脚下有路，愿你的人生一路繁花！', gender: 'all', season: 'all', tags: '通用,励志', usageCount: 0, source: '系统预设' },
  { id: 'w052', content: '每一岁都是新的开始，每一岁都值得被庆祝。愿你的生日充满欢笑，愿你的生活充满美好！', gender: 'all', season: 'all', tags: '通用,温馨', usageCount: 0, source: '系统预设' },
  { id: 'w053', content: '愿你在未来的日子里，所求皆如愿，所行化坦途。多喜乐，长安宁！', gender: 'all', season: 'all', tags: '通用,祝福', usageCount: 0, source: '系统预设' },
  { id: 'w054', content: '岁月静好，愿你安好，愿你被这个世界温柔以待！', gender: 'all', season: 'all', tags: '通用,温柔', usageCount: 0, source: '系统预设' },
  { id: 'w055', content: '愿你的生日成为一年中最特别的日子，愿你的每一天都如生日般快乐！', gender: 'all', season: 'all', tags: '通用,快乐', usageCount: 0, source: '系统预设' },
  { id: 'w056', content: '生活需要仪式感，而你的生日就是最美的仪式。愿你在新的一岁里，遇见更好的自己！', gender: 'all', season: 'all', tags: '通用,励志', usageCount: 0, source: '系统预设' },
  { id: 'w057', content: '愿你的笑容永远灿烂，愿你的心情永远晴朗，愿你幸福安康！', gender: 'all', season: 'all', tags: '通用,祝福', usageCount: 0, source: '系统预设' },
  { id: 'w058', content: '又长了一岁，愿你更加成熟、更加自信、更加快乐。未来的路，愿你走得坚定而从容！', gender: 'all', season: 'all', tags: '通用,成长', usageCount: 0, source: '系统预设' },
  { id: 'w059', content: '愿你的生活有滋有味，愿你的工作有声有色，愿你的人生有梦有光。', gender: 'all', season: 'all', tags: '通用,祝福', usageCount: 0, source: '系统预设' },
  { id: 'w060', content: '在这个特别的日子里，愿所有的美好都为你而来，愿你一生幸福！', gender: 'all', season: 'all', tags: '通用,祝福', usageCount: 0, source: '系统预设' },
];
