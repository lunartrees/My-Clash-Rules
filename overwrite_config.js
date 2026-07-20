/*!
powerfullz 的 Substore 订阅转换脚本
https://github.com/powerfullz/override-rules

支持的传入参数：
- grouptype: 地区代理组类型（0=select 手动选择, 1=url-test 自动测速, 2=load-balance 负载均衡，默认 1）
  - 向后兼容：若未传 grouptype 但传了 loadbalance，则 loadbalance=true 映射为 grouptype=2，loadbalance=false 映射为 grouptype=1
- landing: 启用落地节点功能（如机场家宽/星链/落地分组，默认 false）
- ipv6: 启用 IPv6 支持（默认 false）
- tun: 启用 TUN 模式（默认 false）
- full: 输出完整配置（适合纯内核启动，默认 false）
- keepalive: 启用 tcp-keep-alive（默认 false）
- fakeip: DNS 使用 FakeIP 模式（默认 true；传 false 时为 RedirHost）
- quic: 允许 QUIC 流量（UDP 443，默认 false）
- threshold: 地区节点数量小于该值时不显示分组 (默认 0)
- regex: 使用正则过滤模式（include-all + filter）写入各地区代理组，而非直接枚举节点名称（默认 false）

源码已迁移至 `src/*.ts`。
*/
"use strict";

(() => {
  // ============================================================
  // 工具函数
  // ============================================================

  // 惰性初始化辅助函数：c 用于定义模块（首次调用时执行一次初始化），
  // se 用于定义需要导出内容的模块（CommonJS 风格）
  // 参数 o 是初始化函数，r 是缓存变量
  var c = (o, r) => () => (o && (r = o(o = 0)), r);

  var se = (o, r) => () => (r || o((r = { exports: {} }).exports, r), r.exports);

  /**
   * 将输入值解析为布尔值
   * @param {*} o - 输入值
   * @param {boolean} r - 默认值
   * @returns {boolean}
   */
  function g(o, r = false) {
    if (typeof o > "u") return r;
    if (typeof o === "boolean") return o;
    if (typeof o === "string") return o.toLowerCase() === "true" || o === "1";
    return false;
  }

  /**
   * 将输入值解析为整数
   * @param {*} o - 输入值
   * @param {number} r - 默认值
   * @returns {number}
   */
  function x(o, r = 0) {
    if (o === null || typeof o > "u") return r;
    let n = parseInt(String(o), 10);
    return Number.isNaN(n) ? r : n;
  }

  /**
   * 扁平化数组合并
   * @param  {...any} o - 数组
   * @returns {Array}
   */
  function E(...o) {
    return o.flat().filter(Boolean);
  }

  /**
   * 创建正则匹配对象
   * @param {string} o - 原始模式字符串
   * @returns {{ source: string, regex: RegExp, pattern: string }}
   */
  function L(o) {
    return {
      source: o,
      regex: new RegExp(o, "i"),
      pattern: `(?i)${o}`,
    };
  }

  /**
   * 过滤 null/undefined
   * @param {*} o
   * @returns {boolean}
   */
  function $(o) {
    return o !== null;
  }

  // ============================================================
  // 模块：常量定义
  // ============================================================

  // 空模块，仅用于确保严格模式
  var S = c(() => {
    "use strict";
  });

  // 以下变量由模块 C 初始化：
  // y - 节点后缀名（"节点"）
  // t - CDN 基础 URL
  // e - 代理组名称常量表
  // R - 低倍率节点正则匹配对象
  // T - 落地节点正则匹配对象
  // f - 地区配置表（含匹配规则、权重、图标）
  var y, t, e, R, T, f;

  var C = c(() => {
    "use strict";
    S();

    // 节点名称后缀，用于生成如 "香港节点"、"日本节点" 等代理组名
    y = "节点";
    // jsDelivr CDN 基础地址，用于加载图标和规则文件
    t = "https://cdn.jsdelivr.net";

    // 代理组名称常量
    e = {
      SELECT: "选择代理",
      MANUAL: "手动选择",
      AUTO: "自动选择",
      FALLBACK: "故障转移",
      LANDING: "落地节点",
      LOW_COST: "低倍率节点",
      FRONT_PROXY: "前置代理",
      STATIC_RESOURCES: "静态资源",
      AI_SERVICE: "AI服务",
      CRYPTO: "加密货币",
      APPLE: "苹果服务",
      GOOGLE: "谷歌服务",
      MICROSOFT: "微软服务",
      BILIBILI: "哔哩哔哩",
      BAHAMUT: "巴哈姆特",
      XBOX: "Xbox",
      GITHUB: "Github",
      YOUTUBE: "Youtube",
      NETFLIX: "Netflix",
      TIKTOK: "TikTok",
      SPOTIFY: "Spotify",
      TELEGRAM: "Telegram",
      TRUTH_SOCIAL: "Truth Social",
      TWITTER: "Twitter",
      TWITCH: "Twitch",
      REDDIT: "Reddit",
      GAME: "游戏平台",
      WEIBO: "新浪微博",
      PIKPAK: "PikPak网盘",
      DOCKER: "Docker Hub",
      NOTION: "Notion",
      EXTRA_PROXY: "额外代理",
      EXTRA_DIRECT: "额外直连",
      SCRAPE: "影视刮削",
      AD_BLOCK: "广告拦截",
      GLOBAL: "GLOBAL",
      FINAL: "兜底规则",
    };

    // 低倍率节点匹配正则：匹配名称中包含 "0.0~0.5" 倍率、或 "低倍率/省流/实验性" 等关键词的节点
    // 这些节点通常流量消耗较低，适合作为日常使用
    R = L(String.raw`0\.[0-5]|低倍率|省流|实验性`);

    // 落地节点匹配正则：匹配名称中包含 "家宽/家庭宽带/商宽/星链/Starlink/落地" 等关键词的节点
    // 落地节点通常具有原生 IP，适合解锁流媒体等区域限制服务
    T = L(String.raw`家宽|家庭宽带|商宽|商业宽带|星链|Starlink|落地`);

    // 地区配置表
    // 每个地区包含：
    //   weight: 排序权重（值越小越靠前），用于决定代理组在列表中的显示顺序
    //   pattern: 节点名称匹配正则（支持中英文、缩写、机场代码、城市名、国旗 emoji）
    //   icon: 代理组图标 URL（使用 Qure 图标集）
    // 注意：未设置 weight 的地区默认权重为 Infinity，排在最后
    f = {
      香港: {
        weight: 10, // 权重最低，排在最前面
        pattern:
          "香港|港|\\b(?:HK|hk)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌|🇭🇰",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png`,
      },
      澳门: {
        pattern:
          "澳门|\\b(?:MO|mo)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Macau|🇲🇴",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Macao.png`,
      },
      台湾: {
        weight: 20,
        pattern:
          "台|新北|彰化|\\b(?:TW|tw)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC|🇹🇼|🇼🇸",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png`,
      },
      新加坡: {
        weight: 30,
        pattern:
          "新加坡|坡|狮城|\\b(?:SG|sg)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN|🇸🇬",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Singapore.png`,
      },
      日本: {
        weight: 40,
        pattern:
          "日本|川日|东京|大阪|泉日|埼玉|沪日|深日|\\b(?:JP|jp)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI|🇯🇵",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Japan.png`,
      },
      韩国: {
        weight: 45,
        pattern:
          "韩国|韩|韓|春川|Chuncheon|首尔|\\b(?:KR|kr)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|ICN|🇰🇷",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Korea.png`,
      },
      美国: {
        weight: 50,
        pattern:
          "美国|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|亚特兰大|迈阿密|华盛顿|\\b(?:US|us)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC|🇺🇸",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/United_States.png`,
      },
      加拿大: {
        weight: 55,
        pattern:
          "加拿大|渥太华|温哥华|卡尔加里|蒙特利尔|Montreal|\\b(?:CA|ca)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Canada|CANADA|CAN|YVR|YYZ|YUL|🇨🇦",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Canada.png`,
      },
      英国: {
        weight: 60,
        pattern:
          "英国|伦敦|曼彻斯特|Manchester|\\b(?:UK|uk)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Britain|United Kingdom|UNITED KINGDOM|England|GBR|LHR|MAN|🇬🇧",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/United_Kingdom.png`,
      },
      澳大利亚: {
        flag: "🇦🇺",
        pattern:
          "澳洲|澳大利亚|\\b(?:AU|au)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Australia|🇦🇺",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Australia.png`,
      },
      德国: {
        weight: 70,
        pattern:
          "德国|德|柏林|法兰克福|慕尼黑|Munich|\\b(?:DE|de)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Germany|GERMANY|DEU|MUC|🇩🇪",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Germany.png`,
      },
      法国: {
        weight: 80,
        pattern:
          "法国|法|巴黎|马赛|Marseille|\\b(?:FR|fr)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|France|FRANCE|FRA|CDG|MRS|🇫🇷",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/France.png`,
      },
      俄罗斯: {
        pattern:
          "俄罗斯|俄|\\b(?:RU|ru)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Russia|🇷🇺",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Russia.png`,
      },
      泰国: {
        pattern:
          "泰国|泰|\\b(?:TH|th)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Thailand|🇹🇭",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Thailand.png`,
      },
      印度: {
        pattern:
          "印度|\\b(?:IN|in)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|India|🇮🇳",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/India.png`,
      },
      马来西亚: {
        pattern:
          "马来西亚|马来|\\b(?:MY|my)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Malaysia|🇲🇾",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Malaysia.png`,
      },
      阿根廷: {
        pattern:
          "阿根廷|布宜诺斯艾利斯|\\b(?:AR|ar)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Argentina|EZE|🇦🇷",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Argentina.png`,
      },
      芬兰: {
        pattern:
          "芬兰|赫尔辛基|\\b(?:FI|fi)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Finland|HEL|🇫🇮",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Finland.png`,
      },
      埃及: {
        pattern:
          "埃及|开罗|\\b(?:EG|eg)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Egypt|CAI|🇪🇬",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Egypt.png`,
      },
      菲律宾: {
        pattern:
          "菲律宾|马尼拉|\\b(?:PH|ph)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Philippines|MNL|🇵🇭",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Philippines.png`,
      },
      土耳其: {
        pattern:
          "土耳其|伊斯坦布尔|\\b(?:TR|tr)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Turkey|Türkiye|IST|🇹🇷",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Turkey.png`,
      },
      乌克兰: {
        pattern:
          "乌克兰|基辅|\\b(?:UA|ua)(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Ukraine|KBP|🇺🇦",
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Ukraine.png`,
      },
    };
  });

  // ============================================================
  // 参数解析
  // ============================================================

  /**
   * 解析 groupType 参数
   * @param {Object} o - 参数对象
   * @returns {number} 0=select, 1=url-test, 2=load-balance
   */
  /**
   * 解析 groupType 参数
   * 向后兼容逻辑：
   * - 如果传了 loadbalance=true，则 groupType=2（负载均衡）
   * - 如果传了 loadbalance=false，则 groupType=1（自动测速）
   * - 如果传了 grouptype，则优先使用 grouptype 的值
   * - 默认值为 1（自动测速）
   * @param {Object} o - 参数对象
   * @returns {number} 0=select, 1=url-test, 2=load-balance
   */
  function ie(o) {
    // 先根据 loadbalance 参数确定默认值
    let r = o.loadbalance !== undefined ? (g(o.loadbalance) ? 2 : 1) : 1;
    // 如果传了 grouptype 则覆盖默认值，否则使用上面计算的值
    let n = x(o.grouptype, r);
    // 只允许 0/1/2 三个合法值
    return n === 0 || n === 1 || n === 2 ? n : 0;
  }

  /**
   * 解析所有配置参数
   * @param {Object} o - 原始参数对象
   * @returns {Object} 标准化配置对象
   */
  function G(o) {
    return {
      groupType: ie(o),
      landing: g(o.landing),
      ipv6Enabled: g(o.ipv6),
      fullConfig: g(o.full),
      keepAliveEnabled: g(o.keepalive),
      fakeIPEnabled: g(o.fakeip, true),
      quicEnabled: g(o.quic),
      regexFilter: g(o.regex),
      tunEnabled: g(o.tun),
      countryThreshold: x(o.threshold, 0),
    };
  }

  // ============================================================
  // 模块：代理组构建
  // ============================================================

  var K = c(() => {
    "use strict";
    S();
  });

  /**
   * 创建代理组对象
   * @param {Object} param0
   * @param {string} param0.name - 组名
   * @param {string} param0.icon - 图标 URL
   * @param {number} param0.groupType - 组类型
   * @param {Object} param0.nodeSource - 节点来源配置
   * @returns {Object} 代理组配置
   */
  /**
   * 创建代理组对象
   * 根据 groupType 生成不同类型的代理组配置：
   * - type=0 (select): 手动选择模式，用户手动切换节点
   * - type=1 (url-test): 自动测速模式，每 60 秒测速一次，自动选择延迟最低的节点
   * - type=2 (load-balance): 负载均衡模式，使用 sticky-sessions 策略保持会话一致性
   * 
   * 测速 URL 使用 Cloudflare 的 generate_204 端点，稳定可靠
   * @param {Object} param0
   * @param {string} param0.name - 组名
   * @param {string} param0.icon - 图标 URL
   * @param {number} param0.groupType - 组类型
   * @param {Object} param0.nodeSource - 节点来源配置（proxies 列表 或 include-all+filter 正则）
   * @returns {Object} 代理组配置
   */
  function U({ name: o, icon: r, groupType: n, nodeSource: i }) {
    switch (n) {
      case 0:
        // 手动选择模式：用户手动切换代理
        return { name: o, icon: r, type: "select", ...i };
      case 1:
        // 自动测速模式：每 60 秒测速，容忍度 20ms（延迟差小于 20ms 时不切换）
        return {
          name: o,
          icon: r,
          type: "url-test",
          url: "https://cp.cloudflare.com/generate_204",
          interval: 60,
          tolerance: 20,
          ...i,
        };
      case 2:
        // 负载均衡模式：使用 sticky-sessions 策略保持同一会话的请求落在同一节点
        return {
          name: o,
          icon: r,
          type: "load-balance",
          strategy: "sticky-sessions",
          url: "https://cp.cloudflare.com/generate_204",
          interval: 60,
          tolerance: 20,
          ...i,
        };
    }
  }

  /**
   * 构建地区代理组列表
   * @param {Object} param0
   * @param {string[]} param0.countries - 国家/地区列表
   * @param {boolean} param0.landing - 是否启用落地
   * @param {number} param0.groupType - 组类型
   * @param {boolean} param0.regexFilter - 是否使用正则过滤
   * @param {Array} param0.countryInfo - 国家节点信息
   * @returns {Object[]} 代理组配置数组
   */
  /**
   * 构建地区代理组列表
   * 为每个有节点的国家/地区创建一个代理组。
   * 支持两种节点选择模式：
   * 1. regexFilter=true: 使用 include-all + filter 正则匹配（动态匹配，适用于节点列表会变化的情况）
   * 2. regexFilter=false: 直接枚举节点名称（静态匹配，性能更好）
   * 
   * 地区代理组的类型由传入的 groupType 参数控制（默认 1=自动测速），
   * 可通过 grouptype 参数统一修改所有地区代理组的类型。
   * 如果启用了 landing 模式，地区代理组会排除落地节点（通过 exclude-filter）
   * @param {Object} param0
   * @param {string[]} param0.countries - 国家/地区列表（已按权重排序）
   * @param {boolean} param0.landing - 是否启用落地模式
   * @param {number} param0.groupType - 组类型（0=select, 1=url-test, 2=load-balance，默认 1）
   * @param {boolean} param0.regexFilter - 是否使用正则过滤
   * @param {Array} param0.countryInfo - 国家节点信息 [{country, nodes}]
   * @returns {Object[]} 代理组配置数组
   */
  function D({ countries: o, landing: r, groupType: n, regexFilter: i, countryInfo: l }) {
    let a = [];
    // 如果使用正则模式，不需要预构建节点映射表
    // 否则将 [{country, nodes}] 转换为 { country: [node1, node2, ...] } 的映射
    let p = i
      ? null
      : Object.fromEntries(l.map((s) => [s.country, s.nodes]));

    for (let s of o) {
      let u = f[s];
      if (!u) continue; // 跳过未配置的地区
      let d = `${s}${y}`; // 生成代理组名称，如 "香港节点"
      let m = u.icon;
      // 根据 regexFilter 模式选择不同的节点来源配置
      let I = i
        ? {
            "include-all": true, // 包含所有节点
            filter: u.pattern,   // 用正则过滤出匹配该地区的节点
            ...(r ? { "exclude-filter": T.pattern } : {}), // 落地模式下排除落地节点
          }
        : { proxies: p?.[s] ?? [] }; // 直接使用预计算的节点列表
      a.push(U({ name: d, icon: m, groupType: n, nodeSource: I }));
    }
    return a;
  }

  /**
   * 构建所有代理组（功能组 + 地区组）
   * @param {Object} param0
   * @returns {Object[]} 完整代理组配置
   */
  /**
   * 构建所有代理组（功能组 + 地区组）
   * 这是整个配置的核心函数，生成完整的 proxy-groups 列表。
   * 包含以下类型的代理组（按顺序）：
   * 1. 选择代理 - 全局入口组
   * 2. 自动选择 - 包含所有节点，按原始顺序排列，自动测速
   * 3. 故障转移 - 自动切换组
   * 4. 手动选择 - 包含所有节点的全量选择组
   * 5. 前置代理 - 可选，用于前置代理场景
   * 6. 落地节点 - 可选，用于家宽/星链等落地节点
   * 7. 各类服务分组 - 如 AI、流媒体、社交等
   * 8. 低倍率节点 - 可选，低流量消耗节点
   * 9. 地区代理组 - 按国家/地区划分（默认自动测速，可通过 grouptype 参数修改）
   * 
   * 特殊逻辑：
   * - Bilibili：同时有台湾和香港节点时，使用 DIRECT + 台湾/香港节点
   * - Bahamut：有台湾节点时优先使用台湾节点
   * - Truth Social：有美国节点时优先使用美国节点
   * @param {Object} param0
   * @returns {Object[]} 完整代理组配置
   */
  function v({
    landing: o,
    regexFilter: r,
    groupType: n,
    countries: i,
    countryProxyGroups: l,
    lowCostNodes: a,
    landingNodes: p,
    defaultProxies: s,
    defaultProxiesDirect: u,
    defaultSelector: d,
    defaultFallback: m,
    frontProxySelector: I,
    allNodes: b,
  }) {
    // 检查是否有特定地区的节点，用于决定某些服务的代理策略
    let hasTW = i.includes("台湾");
    let hasHK = i.includes("香港");
    let hasUS = i.includes("美国");

    return [
      // 选择代理
      {
        name: e.SELECT,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Proxy.png`,
        type: "select",
        proxies: d,
      },
      // 自动选择（包含所有节点，按原始顺序排列）
      {
        name: e.AUTO,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Auto.png`,
        type: "url-test",
        url: "https://cp.cloudflare.com/generate_204",
        proxies: b,
        interval: 60,
        tolerance: 20,
      },
      // 故障转移
      {
        name: e.FALLBACK,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Available_1.png`,
        type: "fallback",
        url: "https://cp.cloudflare.com/generate_204",
        proxies: m,
        interval: 60,
        tolerance: 20,
      },
      // 手动选择（按原始节点顺序排列）
      {
        name: e.MANUAL,
        icon: `${t}/gh/shindgewongxj/WHATSINStash@master/icon/select.png`,
        proxies: b,
        type: "select",
      },
      // 前置代理（可选）
      o
        ? {
            name: e.FRONT_PROXY,
            icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Area.png`,
            type: "select",
            ...(r
              ? { "include-all": true, "exclude-filter": T.pattern, proxies: I }
              : { proxies: I }),
          }
        : null,
      // 落地节点（可选）
      o
        ? {
            name: e.LANDING,
            icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Airport.png`,
            type: "select",
            ...(r
              ? { "include-all": true, filter: T.pattern }
              : { proxies: p }),
          }
        : null,
      // 静态资源
      {
        name: e.STATIC_RESOURCES,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Cloudflare.png`,
        type: "select",
        proxies: s,
      },
      // AI服务
      {
        name: e.AI_SERVICE,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/ChatGPT.png`,
        type: "select",
        proxies: s,
      },
      // 苹果服务（默认使用 DIRECT）
      {
        name: e.APPLE,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Apple_2.png`,
        type: "select",
        proxies: u,
      },
      // 谷歌服务
      {
        name: e.GOOGLE,
        icon: `${t}/gh/Orz-3/mini@master/Color/Google.png`,
        type: "select",
        proxies: s,
      },
      // Docker Hub
      {
        name: e.DOCKER,
        icon: "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/00c43aa6857e2905b1d59bfceddfca7bc145f44a/svg/docker.svg",
        type: "select",
        proxies: s,
      },
      // 影视刮削
      {
        name: e.SCRAPE,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Media.png`,
        type: "select",
        proxies: s,
      },
      // 微软服务（默认使用 DIRECT）
      {
        name: e.MICROSOFT,
        icon: `${t}/gh/powerfullz/override-rules@master/icons/Microsoft_Copilot.png`,
        type: "select",
        proxies: u,
      },
      // Xbox
      {
        name: e.XBOX,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Xbox.png`,
        type: "select",
        proxies: s,
      },
      // Github
      {
        name: e.GITHUB,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/GitHub.png`,
        type: "select",
        proxies: s,
      },
      // 哔哩哔哩
      {
        name: e.BILIBILI,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/bilibili.png`,
        type: "select",
        proxies: hasTW && hasHK
          ? ["DIRECT", "台湾节点", "香港节点"]
          : u,
      },
      // 巴哈姆特
      {
        name: e.BAHAMUT,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Bahamut.png`,
        type: "select",
        proxies: hasTW
          ? ["台湾节点", e.SELECT, e.MANUAL, "DIRECT"]
          : s,
      },
      // Youtube
      {
        name: e.YOUTUBE,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/YouTube.png`,
        type: "select",
        proxies: s,
      },
      // Twitch
      {
        name: e.TWITCH,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Twitch.png`,
        type: "select",
        proxies: s,
      },
      // Netflix
      {
        name: e.NETFLIX,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Netflix.png`,
        type: "select",
        proxies: s,
      },
      // TikTok
      {
        name: e.TIKTOK,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/TikTok.png`,
        type: "select",
        proxies: s,
      },
      // Spotify
      {
        name: e.SPOTIFY,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Spotify.png`,
        type: "select",
        proxies: s,
      },
      // Telegram
      {
        name: e.TELEGRAM,
        icon: `${t}/gh/powerfullz/override-rules@master/icons/Telegram.png`,
        type: "select",
        proxies: s,
      },
      // Twitter
      {
        name: e.TWITTER,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Twitter.png`,
        type: "select",
        proxies: s,
      },
      // Reddit
      {
        name: e.REDDIT,
        icon: "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/00c43aa6857e2905b1d59bfceddfca7bc145f44a/svg/reddit.svg",
        type: "select",
        proxies: s,
      },
      // Truth Social
      {
        name: e.TRUTH_SOCIAL,
        icon: `${t}/gh/powerfullz/override-rules@master/icons/Truth_Social.png`,
        type: "select",
        proxies: hasUS
          ? ["美国节点", e.SELECT, e.MANUAL]
          : s,
      },
      // PikPak网盘
      {
        name: e.PIKPAK,
        icon: `${t}/gh/powerfullz/override-rules@master/icons/PikPak.png`,
        type: "select",
        proxies: s,
      },
      // 游戏平台
      {
        name: e.GAME,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Game.png`,
        type: "select",
        proxies: s,
      },
      // 兜底规则
      {
        name: e.FINAL,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Final.png`,
        type: "select",
        proxies: ["DIRECT", e.SELECT],
      },
      // 广告拦截
      {
        name: e.AD_BLOCK,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/AdBlack.png`,
        type: "select",
        proxies: ["REJECT", "REJECT-DROP", "DIRECT"],
      },
      // 低倍率节点（可选）
      a.length > 0 || r
        ? U({
            name: e.LOW_COST,
            icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Lab.png`,
            groupType: n,
            nodeSource: r
              ? { "include-all": true, filter: R.pattern }
              : { proxies: a },
          })
        : null,
      // 地区代理组
      ...l,
    ].filter($);
  }

  // ============================================================
  // 模块：节点处理
  // ============================================================

  var P = c(() => {
    "use strict";
    C();
    S();
  });

  /**
   * 提取低倍率节点名称
   * @param {Object} o - 代理配置对象
   * @returns {string[]} 低倍率节点名称列表
   */
  /**
   * 提取低倍率节点名称
   * 低倍率节点是指倍率在 0.0~0.5 之间，或名称包含 "低倍率/省流/实验性" 的节点。
   * 这些节点通常流量消耗较低，适合作为日常浏览使用。
   * @param {Object} o - 代理配置对象
   * @returns {string[]} 低倍率节点名称列表
   */
  function k(o) {
    return (o.proxies || [])
      .filter((r) => R.regex.test(r.name || ""))
      .map((r) => r.name)
      .filter((r) => !!r);
  }

  /**
   * 分离落地节点和非落地节点
   * @param {Object} o - 代理配置对象
   * @returns {{ landingNodes: string[], nonLandingNodes: string[] }}
   */
  /**
   * 分离落地节点和非落地节点
   * 落地节点（家宽/星链/落地）通常具有原生 IP，适合解锁流媒体等区域限制服务。
   * 非落地节点是普通的机房 IP 节点。
   * 当 landing=true 时，落地节点会被单独分组，方便用户按需使用。
   * @param {Object} o - 代理配置对象
   * @returns {{ landingNodes: string[], nonLandingNodes: string[] }}
   *   landingNodes: 匹配落地正则的节点名称列表
   *   nonLandingNodes: 不匹配落地正则的节点名称列表
   */
  function B(o) {
    let r = []; // 落地节点列表
    let n = []; // 非落地节点列表
    for (let i of o.proxies || []) {
      let l = i.name;
      if (l) {
        if (T.regex.test(l)) {
          r.push(l); // 匹配落地正则，加入落地节点列表
          continue;
        }
        n.push(l); // 不匹配，加入非落地节点列表
      }
    }
    return { landingNodes: r, nonLandingNodes: n };
  }

  /**
   * 按国家/地区分类节点
   * @param {Object} o - 代理配置对象
   * @param {boolean} r - 是否排除落地节点
   * @returns {Array<{ country: string, nodes: string[] }>}
   */
  /**
   * 按国家/地区分类节点
   * 遍历所有节点，使用预编译的地区正则表（le）进行匹配。
   * 每个节点只匹配第一个匹配到的地区（break 防止重复分类）。
   * 如果启用了 landing 模式且 r=true，则跳过落地节点（它们会被单独处理）。
   * 
   * 匹配优先级由 Object.entries(le) 的遍历顺序决定，即 f 对象中定义的顺序。
   * @param {Object} o - 代理配置对象
   * @param {boolean} r - 是否排除落地节点（当 landing=true 时传 true）
   * @returns {Array<{ country: string, nodes: string[] }>}
   *   返回按国家/地区分组的节点列表，如 [{country: "香港", nodes: ["HK 01", "HK 02"]}, ...]
   */
  function M(o, r = false) {
    let n = o.proxies || [];
    let i = Object.create(null); // 使用无原型的空对象作为映射表
    for (let l of n) {
      let a = l.name || "";
      // 如果启用了落地排除模式，跳过落地节点
      if (!(r && T.regex.test(a))) {
        // 遍历所有地区的正则，找到第一个匹配的
        for (let [p, s] of Object.entries(le)) {
          if (s.test(a)) {
            i[p] || (i[p] = []); // 初始化数组
            i[p].push(a); // 添加节点到对应地区
            break; // 匹配到第一个地区后停止
          }
        }
      }
    }
    // 将映射表转换为数组格式
    return Object.entries(i).map(([l, a]) => ({ country: l, nodes: a }));
  }

  /**
   * 过滤并排序国家/地区（按阈值和权重）
   * @param {Array<{ country: string, nodes: string[] }>} o - 国家节点信息
   * @param {number} r - 阈值
   * @returns {string[]} 排序后的国家/地区名称（带"节点"后缀）
   */
  /**
   * 过滤并排序国家/地区
   * 1. 过滤：只保留节点数量 >= threshold 的地区（避免节点太少时显示过多分组）
   * 2. 排序：按配置的 weight 权重升序排列（权重越小越靠前）
   * 3. 格式化：在地区名后添加"节点"后缀，如 "香港" -> "香港节点"
   * 
   * 未设置 weight 的地区默认权重为 Infinity，会排在最后。
   * @param {Array<{ country: string, nodes: string[] }>} o - 国家节点信息
   * @param {number} r - 阈值（countryThreshold 参数）
   * @returns {string[]} 排序后的国家/地区名称（带"节点"后缀）
   */
  function F(o, r) {
    // 过滤：只保留节点数量达到阈值的地区
    let n = o.filter((i) => i.nodes.length >= r);
    return n
      .sort((i, l) => {
        // 按权重升序排序，未设置权重的排在最后
        let a = f[i.country]?.weight ?? Infinity;
        let p = f[l.country]?.weight ?? Infinity;
        return a - p;
      })
      .map((i) => i.country + y); // 添加"节点"后缀
  }

  /**
   * 移除国家/地区名称中的"节点"后缀
   * @param {string[]} o - 带后缀的名称数组
   * @returns {string[]} 移除后缀后的名称数组
   */
  /**
   * 移除国家/地区名称中的"节点"后缀
   * 用于将 "香港节点" 还原为 "香港"，以便在后续处理中作为键名使用。
   * @param {string[]} o - 带后缀的名称数组，如 ["香港节点", "日本节点"]
   * @returns {string[]} 移除后缀后的名称数组，如 ["香港", "日本"]
   */
  function w(o) {
    // 移除末尾的"节点"后缀以及开头的 flag emoji
    // 例如 "🇭🇰香港节点" -> "香港"
    let suffix = new RegExp(`${y}$`);
    return o.map((n) => {
      let name = n.replace(suffix, "");
      // 移除开头的 flag emoji（由多个 Unicode 字符组成）
      return name.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}/u, "");
    });
  }

  // 预编译的地区正则表
  // 将 f 中的 pattern 字符串（带 (?i) 前缀）转换为 RegExp 对象
  // 用于高效匹配节点所属地区
  var le;

  var Q = c(() => {
    "use strict";
    C();
    le = Object.fromEntries(
      Object.entries(f).map(([o, r]) => [o, new RegExp(r.pattern.replace(/^\(\?i\)/, ""))])
    );
  });

  // ============================================================
  // 模块：规则构建
  // ============================================================

  /**
   * 构建规则列表
   * @param {Object} param0
   * @param {boolean} param0.quicEnabled - 是否允许 QUIC
   * @returns {string[]} 规则列表
   */
  /**
   * 构建规则列表
   * 如果 quicEnabled=false（默认），则在规则列表最前面插入一条 QUIC 阻断规则：
   * "AND,((DST-PORT,443),(NETWORK,UDP)),REJECT"
   * 这条规则会阻止 UDP 443 端口的流量（即 QUIC 协议），
   * 强制使用 TCP 连接，以便代理软件能够正确接管流量。
   * 
   * 如果 quicEnabled=true，则允许 QUIC 流量通过。
   * @param {Object} param0
   * @param {boolean} param0.quicEnabled - 是否允许 QUIC
   * @returns {string[]} 规则列表
   */
  function H({ quicEnabled: o }) {
    let r = [...ae]; // 复制基础规则列表
    if (o) r.unshift("AND,((DST-PORT,443),(NETWORK,UDP)),REJECT");
    return r;
  }

  var ae;

  var z = c(() => {
    "use strict";
    C();
    ae = [
      // 自定义规则（优先匹配，避免被其他规则拦截）
      `RULE-SET,ExtraProxy,${e.SELECT}`,
      `RULE-SET,ExtraDirect,DIRECT`,
      `RULE-SET,Scrape,${e.SCRAPE}`,
      `RULE-SET,Docker,${e.DOCKER}`,
      `RULE-SET,Notion,${e.SELECT}`,
      // 私有网络
      "GEOIP,private,DIRECT,no-resolve",
      // 广告拦截
      `RULE-SET,AWA-Ads,${e.AD_BLOCK}`,
      // 特殊域名
      `DOMAIN-SUFFIX,truthsocial.com,${e.TRUTH_SOCIAL}`,
      // 静态资源/CDN
      `RULE-SET,StaticResources,${e.STATIC_RESOURCES}`,
      `RULE-SET,CDNResources,${e.STATIC_RESOURCES}`,
      `RULE-SET,AdditionalCDNResources,${e.STATIC_RESOURCES}`,
      // AI 服务
      `GEOSITE,category-ai-!cn,${e.AI_SERVICE}`,
      // 流媒体
      `GEOSITE,bilibili,${e.BILIBILI}`,
      `GEOSITE,youtube,${e.YOUTUBE}`,
      `GEOSITE,netflix,${e.NETFLIX}`,
      `GEOSITE,twitch,${e.TWITCH}`,
      `GEOIP,netflix,${e.NETFLIX},no-resolve`,
      `GEOSITE,spotify,${e.SPOTIFY}`,
      `GEOSITE,bahamut,${e.BAHAMUT}`,
      `GEOSITE,pikpak,${e.PIKPAK}`,
      // 社交
      `GEOSITE,telegram,${e.TELEGRAM}`,
      `GEOIP,telegram,${e.TELEGRAM},no-resolve`,
      `GEOSITE,twitter,${e.TWITTER}`,
      `RULE-SET,Reddit,${e.REDDIT}`,
      `RULE-SET,TikTok,${e.TIKTOK}`,
      // 游戏
      `GEOSITE,xbox,${e.XBOX}`,
      `GEOSITE,github,${e.GITHUB}`,
      "RULE-SET,SteamFix,DIRECT",
      `RULE-SET,Epic,${e.GAME}`,
      `RULE-SET,Origin,${e.GAME}`,
      `RULE-SET,Sony,${e.GAME}`,
      `RULE-SET,Steam,${e.GAME}`,
      `RULE-SET,Nintendo,${e.GAME}`,
      `RULE-SET,Rockstar,${e.GAME}`,
      // 推送服务
      "RULE-SET,GoogleFCM,DIRECT",
      "GEOSITE,google-play@cn,DIRECT",
      "GEOSITE,microsoft@cn,DIRECT",
      // 科技公司
      `GEOSITE,apple,${e.APPLE}`,
      `GEOSITE,microsoft,${e.MICROSOFT}`,
      `GEOSITE,google,${e.GOOGLE}`,
      // 加密货币
      `RULE-SET,Crypto,${e.SELECT}`,
      // GFW 列表（被墙域名）
      `RULE-SET,GFWList,${e.SELECT}`,
      // 国内直连
      "GEOIP,cn,DIRECT",
      // 兜底
      `MATCH,${e.FINAL}`,
    ];
  });

  // ============================================================
  // 模块：规则提供者
  // ============================================================

  var W;

  var X = c(() => {
    "use strict";
    C();
    W = {
      "AWA-Ads": {
        type: "http",
        behavior: "domain",
        format: "yaml",
        interval: 86400,
        url: "https://raw.githubusercontent.com/TG-Twilight/AWAvenue-Ads-Rule/main/Filters/AWAvenue-Ads-Rule-Clash.yaml",
        path: "./ruleset/AWA-Ads.yaml",
      },
      StaticResources: {
        type: "http",
        behavior: "domain",
        format: "text",
        interval: 86400,
        url: "https://ruleset.skk.moe/Clash/domainset/cdn.txt",
        path: "./ruleset/StaticResources.txt",
      },
      CDNResources: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: "https://ruleset.skk.moe/Clash/non_ip/cdn.txt",
        path: "./ruleset/CDNResources.txt",
      },
      TikTok: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: `${t}/gh/powerfullz/override-rules@master/ruleset/TikTok.list`,
        path: "./ruleset/TikTok.list",
      },
      SteamFix: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: `${t}/gh/powerfullz/override-rules@master/ruleset/SteamFix.list`,
        path: "./ruleset/SteamFix.list",
      },
      GoogleFCM: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: `${t}/gh/powerfullz/override-rules@master/ruleset/FirebaseCloudMessaging.list`,
        path: "./ruleset/FirebaseCloudMessaging.list",
      },
      AdditionalCDNResources: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: `${t}/gh/powerfullz/override-rules@master/ruleset/AdditionalCDNResources.list`,
        path: "./ruleset/AdditionalCDNResources.list",
      },
      Crypto: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: `${t}/gh/powerfullz/override-rules@master/ruleset/Crypto.list`,
        path: "./ruleset/Crypto.list",
      },
      Scrape: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: "https://raw.githubusercontent.com/lunartrees/My-Clash-Rules/refs/heads/main/Scrape.list",
        path: "./ruleset/Scrape.list",
      },
      Docker: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: "https://raw.githubusercontent.com/LM-Firefly/Rules/master/PROXY/Docker.list",
        path: "./ruleset/Docker.list",
      },
      Notion: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Notion/Notion.list",
        path: "./ruleset/Notion.list",
      },
      ExtraProxy: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: "https://raw.githubusercontent.com/lunartrees/My-Clash-Rules/refs/heads/main/ExtraProxyRules.list",
        path: "./ruleset/ExtraProxy.list",
      },
      ExtraDirect: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: "https://raw.githubusercontent.com/lunartrees/My-Clash-Rules/refs/heads/main/ExtraDirectRules.list",
        path: "./ruleset/ExtraDirect.list",
      },
      Reddit: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Reddit/Reddit.list",
        path: "./ruleset/Reddit.list",
      },
      Epic: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Epic.list",
        path: "./ruleset/Epic.list",
      },
      Origin: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Origin.list",
        path: "./ruleset/Origin.list",
      },
      Sony: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Sony.list",
        path: "./ruleset/Sony.list",
      },
      Steam: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Steam.list",
        path: "./ruleset/Steam.list",
      },
      Nintendo: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Nintendo.list",
        path: "./ruleset/Nintendo.list",
      },
      Rockstar: {
        type: "http",
        behavior: "classical",
        format: "text",
        interval: 86400,
        url: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Rockstar/Rockstar.list",
        path: "./ruleset/Rockstar.list",
      },
      GFWList: {
        type: "http",
        behavior: "domain",
        format: "yaml",
        interval: 86400,
        url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/gfw.txt",
        path: "./ruleset/GFWList.yaml",
      },
    };
  });

  // ============================================================
  // 模块：DNS 配置
  // ============================================================

  /**
   * 构建 DNS 配置
   * @param {Object} param0
   * @param {string} param0.mode - DNS 模式
   * @param {boolean} param0.ipv6Enabled - 是否启用 IPv6
   * @param {string[]} param0.fakeIpFilter - FakeIP 过滤列表
   * @returns {Object} DNS 配置
   */
  /**
   * 构建 DNS 配置
   * DNS 配置说明：
   * - default-nameserver: 用于解析 DNS 服务器本身的域名（必须使用纯 IP 的 DNS）
   * - nameserver: 主要 DNS 服务器（国内 DNS，低延迟）
   * - fallback: 备用 DNS 服务器（国外 DNS，用于解析被污染的域名）
   * - proxy-server-nameserver: 用于解析代理服务器域名的 DNS（使用国内 DNS 避免 DNS 泄露）
   * - fake-ip-filter: FakeIP 模式下，这些域名会返回真实 IP（绕过 FakeIP）
   * 
   * DNS 服务器选择策略：
   * - 国内：阿里 DNS (223.5.5.5)、腾讯 DNS (119.29.29.29)
   * - 国外：Cloudflare DNS、DNS.sb、DNS0.eu
   * - 代理专用：阿里 DNS (HTTPS)、DNSPod (TLS)
   * @param {Object} param0
   * @param {string} param0.mode - DNS 模式（"fake-ip" 或 "redir-host"）
   * @param {boolean} param0.ipv6Enabled - 是否启用 IPv6
   * @param {string[]} param0.fakeIpFilter - FakeIP 过滤列表
   * @returns {Object} DNS 配置
   */
  function Y({ mode: o, ipv6Enabled: r, fakeIpFilter: n }) {
    let i = {
      enable: true,
      ipv6: r,
      "prefer-h3": true, // 优先使用 HTTP/3 (QUIC) 进行 DNS 查询
      "enhanced-mode": o,
      "default-nameserver": ["119.29.29.29", "223.5.5.5"],
      nameserver: ["system", "223.5.5.5", "119.29.29.29", "180.184.1.1"],
      fallback: [
        "quic://dns0.eu",
        "https://dns.cloudflare.com/dns-query",
        "https://dns.sb/dns-query",
        "tcp://208.67.222.222",
        "tcp://8.26.56.2",
      ],
      "proxy-server-nameserver": [
        "https://dns.alidns.com/dns-query",
        "tls://dot.pub",
      ],
    };
    if (n) i["fake-ip-filter"] = n;
    return i;
  }

  /**
   * 根据参数选择 DNS 模式
   * @param {Object} param0
   * @param {boolean} param0.fakeIPEnabled - 是否启用 FakeIP
   * @param {boolean} param0.ipv6Enabled - 是否启用 IPv6
   * @returns {Object} DNS 配置
   */
  /**
   * 根据参数选择 DNS 模式
   * FakeIP 模式：返回虚拟 IP，实际请求时再通过代理 DNS 解析真实 IP
   *   - 优点：减少 DNS 泄露，提高隐私性
   *   - 缺点：部分应用可能不兼容 FakeIP
   * RedirHost 模式：直接返回真实 IP
   *   - 优点：兼容性好
   *   - 缺点：可能存在 DNS 泄露风险
   * @param {Object} param0
   * @param {boolean} param0.fakeIPEnabled - 是否启用 FakeIP
   * @param {boolean} param0.ipv6Enabled - 是否启用 IPv6
   * @returns {Object} DNS 配置
   */
  function j({ fakeIPEnabled: o, ipv6Enabled: r }) {
    return Y(
      o
        ? { mode: "fake-ip", ipv6Enabled: r, fakeIpFilter: pe }
        : { mode: "redir-host", ipv6Enabled: r }
    );
  }

  // FakeIP 过滤列表：这些域名在 FakeIP 模式下会返回真实 IP
  // 包括：内网域名、连通性检测、小米云、iCloud、STUN 等
  var pe, Z;

  var J = c(() => {
    "use strict";
    pe = [
      "geosite:private",           // 私有域名
      "geosite:connectivity-check", // 网络连通性检测
      "Mijia Cloud",               // 小米云
      "dig.io.mi.com",             // 小米 DDNS
      "localhost.ptlogin2.qq.com", // QQ 登录
      "*.icloud.com",              // iCloud
      "*.stun.*.*",                // STUN 协议
      "*.stun.*.*.*",
    ];
    // 流量嗅探配置：用于识别 TLS/HTTP/QUIC 流量
    Z = {
      sniff: {
        TLS: { ports: [443, 8443] },
        HTTP: { ports: [80, 8080, 8880] },
        QUIC: { ports: [443, 8443] },
      },
      "override-destination": false, // 不覆盖目标地址
      enable: true,
      "force-dns-mapping": true,     // 强制 DNS 映射
      "skip-domain": [               // 跳过嗅探的域名
        "Mijia Cloud",
        "dlg.io.mi.com",
        "+.push.apple.com",          // Apple 推送服务
      ],
    };
  });

  // ============================================================
  // 模块：TUN 配置
  // ============================================================

  /**
   * 构建 TUN 配置
   * @param {boolean} o - 是否启用 TUN
   * @returns {Object} TUN 配置
   */
  /**
   * 构建 TUN 配置
   * TUN 模式允许代理软件创建虚拟网卡，接管所有系统流量。
   * route-exclude-address 排除以下地址段（不经过 TUN）：
   * - 100.64.0.0/10: CGNAT 地址段（运营商级 NAT）
   * - fd7a:115c:a1e0::/48: Tailscale 地址段
   * - 192.168.0.0/16: 内网地址段
   * - fd00::/8: 内网 IPv6 地址段
   * 
   * dns-hijack 劫持所有 DNS 请求（端口 53），强制使用配置的 DNS。
   * @param {boolean} o - 是否启用 TUN
   * @returns {Object} TUN 配置
   */
  function q(o) {
    return {
      enable: o,
      stack: "gvisor", // 使用 gvisor 网络栈（性能更好）
      device: "mihomo", // 虚拟网卡名称
      "route-exclude-address": [
        "100.64.0.0/10",
        "fd7a:115c:a1e0::/48",
        "192.168.0.0/16",
        "fd00::/8",
      ],
      "dns-hijack": ["any:53"], // 劫持所有 DNS 请求
      mtu: 1500, // 最大传输单元
    };
  }

  var V = c(() => {
    "use strict";
  });

  // ============================================================
  // 模块：默认代理列表构建
  // ============================================================

  /**
   * 构建默认代理列表
   * @param {Object} param0
   * @returns {Object} 各场景默认代理列表
   */
  /**
   * 构建默认代理列表
   * 为不同场景生成默认的代理选择列表：
   * - defaultProxies: 普通服务的默认代理（如流媒体、社交等）
   * - defaultProxiesDirect: 国内服务的默认代理（优先 DIRECT）
   * - defaultSelector: 选择代理的候选列表（包含 AUTO、FALLBACK、地区组等）
   * - defaultFallback: 故障转移的候选列表（仅包含落地节点组和地区组）
   * - frontProxySelector: 前置代理的候选列表
   * 
   * 注意：自动选择（AUTO）组现在直接包含所有节点（按原始顺序），不再使用 defaultSelector。
   * 
   * 列表构建逻辑：
   * - 如果启用了 landing，加入落地节点组
   * - 如果有低倍率节点或使用正则模式，加入低倍率节点组
   * - 加入地区代理组
   * - 加入手动选择组
   * - 加入 DIRECT（直连）
   * @param {Object} param0
   * @returns {Object} 各场景默认代理列表
   */
  function ee({
    landing: o,
    lowCostNodes: r,
    countryGroupNames: n,
    nonLandingNodes: i,
    regexFilter: l,
  }) {
    // 是否有低倍率节点（用于决定是否显示低倍率分组）
    let a = r.length > 0 || l;
    // 自动选择/故障转移的候选列表
    let p = E(
      e.AUTO,
      e.FALLBACK,
      o && e.LANDING,
      n,
      a && e.LOW_COST,
      e.MANUAL,
      "DIRECT"
    );
    // 普通服务的默认代理（如流媒体、社交等）
    let s = E(
      e.SELECT,
      o && e.LANDING,
      n,
      a && e.LOW_COST,
      e.MANUAL,
      "DIRECT"
    );
    // 国内服务的默认代理（优先 DIRECT）
    let u = E(
      "DIRECT",
      o && e.LANDING,
      n,
      a && e.LOW_COST,
      e.SELECT,
      e.MANUAL
    );
    // 故障转移的候选列表
    let d = E(o && e.LANDING, n);
    // 前置代理的候选列表
    let m = E(n, "DIRECT", !l && i);
    return {
      defaultProxies: s,
      defaultProxiesDirect: u,
      defaultSelector: p,
      defaultFallback: d,
      frontProxySelector: m,
    };
  }

  var oe = c(() => {
    "use strict";
    C();
    S();
  });

  // ============================================================
  // 主入口
  // ============================================================

  var he = se(() => {
    C();
    K();
    P();
    Q();
    z();
    X();
    J();
    V();
    oe();

    // Geo 数据 URL
    var ue = {
      geoip: `${t}/gh/MetaCubeX/meta-rules-dat@release/geoip.dat`,
      geosite: `${t}/gh/MetaCubeX/meta-rules-dat@release/geosite.dat`,
      mmdb: `${t}/gh/MetaCubeX/meta-rules-dat@release/country.mmdb`,
      asn: `${t}/gh/MetaCubeX/meta-rules-dat@release/GeoLite2-ASN.mmdb`,
    };

    /**
     * 获取传入参数
     * @returns {Object} 参数对象
     */
    function ce() {
      try {
        return $arguments;
      } catch {
        console.log(
          "[powerfullz 的覆写脚本] 未检测到传入参数，使用默认参数。",
          {}
        );
        return {};
      }
    }

    var ge = ce();
    var {
      groupType: te,
      landing: A,
      ipv6Enabled: re,
      fullConfig: me,
      keepAliveEnabled: de,
      fakeIPEnabled: Te,
      quicEnabled: Ce,
      regexFilter: N,
      tunEnabled: Ie,
      countryThreshold: Ee,
    } = G(ge);

    /**
     * 主转换函数
     * @param {Object} o - 原始代理配置
     * @returns {Object} 转换后的完整配置
     */
    function fe(o) {
      let r = M(o, A);
      let n = k(o);
      let i = F(r, Ee);
      let l = w(i);
      let { landingNodes: a, nonLandingNodes: p } = A
        ? B(o)
        : { landingNodes: [], nonLandingNodes: [] };
      let {
        defaultProxies: s,
        defaultProxiesDirect: u,
        defaultSelector: d,
        defaultFallback: m,
        frontProxySelector: I,
      } = ee({
        landing: A,
        lowCostNodes: n,
        countryGroupNames: i,
        nonLandingNodes: p,
        regexFilter: N,
      });
      let b = D({
        countries: l,
        landing: A,
        groupType: te,
        regexFilter: N,
        countryInfo: r,
      });
      // 提取原始节点名称列表（保持原始顺序）
      let allNodeNames = (o.proxies || []).map((ne) => ne.name).filter(Boolean);
      let h = v({
        landing: A,
        regexFilter: N,
        groupType: te,
        countries: l,
        countryProxyGroups: b,
        lowCostNodes: n,
        landingNodes: a,
        defaultProxies: s,
        defaultProxiesDirect: u,
        defaultSelector: d,
        defaultFallback: m,
        frontProxySelector: I,
        allNodes: allNodeNames,
      });
      let O = h.map((ne) => String(ne.name));

      // 添加 GLOBAL 组
      h.push({
        name: e.GLOBAL,
        icon: `${t}/gh/Koolson/Qure@master/IconSet/Color/Global.png`,
        "include-all": true,
        type: "select",
        proxies: O,
      });

      let _ = H({ quicEnabled: Ce });

      return {
        proxies: o.proxies,
        ...(me && {
          "mixed-port": 7890,
          "redir-port": 7892,
          "tproxy-port": 7893,
          "routing-mark": 7894,
          "allow-lan": true,
          "bind-address": "*",
          ipv6: re,
          mode: "rule",
          "unified-delay": true,
          "tcp-concurrent": true,
          "find-process-mode": "off",
          "log-level": "info",
          "geodata-loader": "standard",
          "external-controller": ":9999",
          "disable-keep-alive": !de,
          profile: { "store-selected": true },
        }),
        "proxy-groups": h,
        "rule-providers": W,
        rules: _,
        sniffer: Z,
        dns: j({ fakeIPEnabled: Te, ipv6Enabled: re }),
        tun: q(Ie),
        "geodata-mode": true,
        "geox-url": ue,
      };
    }

    globalThis.main = fe;
  });

  he();
})();
