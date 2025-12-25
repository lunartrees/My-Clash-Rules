// Clash配置生成器脚本 - 逐行详细注释
// 这个脚本用于生成Clash代理客户端的配置文件

// 定义节点名称的后缀常量
const NODE_SUFFIX = "节点";

// 解析布尔值的函数
// 参数e可以是布尔值或字符串
function parseBool(e) {
  // 如果e已经是布尔类型，直接返回
  return "boolean" == typeof e
    ? e
    // 如果e是字符串类型，检查是否为"true"或"1"（不区分大小写）
    : "string" == typeof e && ("true" === e.toLowerCase() || "1" === e);
}

// 解析数字的函数
// 参数e是要解析的值，t是默认值（默认为0）
function parseNumber(e, t = 0) {
  // 如果e为null或undefined，返回默认值t
  if (null == e) return t;
  // 尝试将e解析为十进制整数
  const o = parseInt(e, 10);
  // 如果解析结果为NaN，返回默认值t，否则返回解析结果
  return isNaN(o) ? t : o;
}

// 构建功能标志对象的函数
// 参数e是包含原始参数的对象
function buildFeatureFlags(e) {
  // 将参数映射转换为功能标志对象
  const t = Object.entries({
    loadbalance: "loadBalance",      // 负载均衡
    landing: "landing",              // 落地节点
    ipv6: "ipv6Enabled",             // IPv6支持
    full: "fullConfig",              // 完整配置
    keepalive: "keepAliveEnabled",   // 保持连接
    fakeip: "fakeIPEnabled",         // FakeIP功能
    quic: "quicEnabled",             // QUIC协议支持
  }).reduce((t, [o, r]) => ((t[r] = parseBool(e[o]) || !1), t), {});
  
  // 解析国家阈值参数
  return (t.countryThreshold = parseNumber(e.threshold, 0)), t;
}

// 获取原始参数，如果$arguments未定义则使用空对象
const rawArgs = "undefined" != typeof $arguments ? $arguments : {},
  // 解构构建的功能标志对象
  {
    loadBalance: loadBalance,          // 负载均衡标志
    landing: landing,                  // 落地节点标志
    ipv6Enabled: ipv6Enabled,          // IPv6启用标志
    fullConfig: fullConfig,            // 完整配置标志
    keepAliveEnabled: keepAliveEnabled, // 保持连接启用标志
    fakeIPEnabled: fakeIPEnabled,      // FakeIP启用标志
    quicEnabled: quicEnabled,          // QUIC启用标志
    countryThreshold: countryThreshold, // 国家阈值
  } = buildFeatureFlags(rawArgs);

// 获取国家组名称的函数
// 参数e是国家对象数组，t是阈值
function getCountryGroupNames(e, t) {
  // 过滤出数量大于阈值的国家，并添加"节点"后缀
  return e.filter((e) => e.count >= t).map((e) => e.country + "节点");
}

// 去除节点后缀的函数
function stripNodeSuffix(e) {
  // 创建匹配"节点"结尾的正则表达式
  const t = new RegExp("节点$");
  // 去除数组中每个元素的"节点"后缀
  return e.map((e) => e.replace(t, ""));
}

// 代理组常量定义
const PROXY_GROUPS = {
    SELECT: "选择代理",    // 选择代理组
    MANUAL: "手动选择",    // 手动选择组
    FALLBACK: "故障转移",  // 故障转移组
    DIRECT: "直连",       // 直连组
    LANDING: "落地节点",   // 落地节点组
    LOW_COST: "低倍率节点", // 低倍率节点组
  },
  // 构建列表的辅助函数，展平数组并过滤掉假值
  buildList = (...e) => e.flat().filter(Boolean);

// 构建基础列表的函数
function buildBaseLists({ landing: e, lowCost: t, countryGroupNames: o }) {
  const r = buildList(
    PROXY_GROUPS.FALLBACK,      // 故障转移组
    e && PROXY_GROUPS.LANDING,  // 如果启用落地节点则添加落地节点组
    o,                          // 国家组名称
    t && PROXY_GROUPS.LOW_COST, // 如果启用低倍率则添加低倍率节点组
    PROXY_GROUPS.MANUAL,        // 手动选择组
    "DIRECT"                    // 直连
  );
  return {
    // 默认代理列表（用于大多数代理组）
    defaultProxies: buildList(
      PROXY_GROUPS.SELECT,      // 选择代理组
      o,                        // 国家组名称
      t && PROXY_GROUPS.LOW_COST, // 低倍率节点组
      PROXY_GROUPS.MANUAL,      // 手动选择组
      PROXY_GROUPS.DIRECT       // 直连组
    ),
    // 默认代理列表（直连优先）
    defaultProxiesDirect: buildList(
      PROXY_GROUPS.DIRECT,      // 直连组
      o,                        // 国家组名称
      t && PROXY_GROUPS.LOW_COST, // 低倍率节点组
      PROXY_GROUPS.SELECT,      // 选择代理组
      PROXY_GROUPS.MANUAL       // 手动选择组
    ),
    // 默认选择器列表
    defaultSelector: r,
    // 默认故障转移列表
    defaultFallback: buildList(
      e && PROXY_GROUPS.LANDING,  // 落地节点组
      o,                          // 国家组名称
      t && PROXY_GROUPS.LOW_COST, // 低倍率节点组
      PROXY_GROUPS.MANUAL,        // 手动选择组
      "DIRECT"                    // 直连
    ),
  };
}

// 规则提供者配置
const ruleProviders = {
    秋风广告规则: {  // 广告拦截规则
      type: "http",        // HTTP类型
      behavior: "domain",  // 域名行为
      format: "yaml",       // YAML格式
      interval: 86400,     // 更新间隔（24小时）
      url: "https://raw.githubusercontent.com/TG-Twilight/AWAvenue-Ads-Rule/main/Filters/AWAvenue-Ads-Rule-Clash.yaml",  // 规则URL
      path: "./ruleset/AWAvenue-Ads-Rule-Clash.yaml",  // 本地保存路径
    },
    /*
    SogouInput: {  // 搜狗输入法规则
      type: "http",
      behavior: "classical",  // 经典行为
      format: "text",         // 文本格式
      interval: 86400,
      url: "https://ruleset.skk.moe/Clash/non_ip/sogouinput.txt",
      path: "./ruleset/SogouInput.txt",
    },
    */
    StaticResources: {  // 静态资源规则
      type: "http",
      behavior: "domain",
      format: "text",
      interval: 86400,
      url: "https://ruleset.skk.moe/Clash/domainset/cdn.txt",
      path: "./ruleset/StaticResources.txt",
    },
    CDNResources: {  // CDN资源规则
      type: "http",
      behavior: "classical",
      format: "text",
      interval: 86400,
      url: "https://ruleset.skk.moe/Clash/non_ip/cdn.txt",
      path: "./ruleset/CDNResources.txt",
    },
    TikTok: {  // TikTok规则
      type: "http",
      behavior: "classical",
      format: "text",
      interval: 86400,
      url: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/TikTok.list",
      path: "./ruleset/TikTok.list",
    },
    EHentai: {  // E-Hentai规则
      type: "http",
      behavior: "classical",
      format: "text",
      interval: 86400,
      url: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/EHentai.list",
      path: "./ruleset/EHentai.list",
    },
    SteamFix: {  // Steam修复规则
      type: "http",
      behavior: "classical",
      format: "text",
      interval: 86400,
      url: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/SteamFix.list",
      path: "./ruleset/SteamFix.list",
    },
    GoogleFCM: {  // Google Firebase Cloud Messaging规则
      type: "http",
      behavior: "classical",
      format: "text",
      interval: 86400,
      url: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/FirebaseCloudMessaging.list",
      path: "./ruleset/FirebaseCloudMessaging.list",
    },
    AdditionalFilter: {  // 附加过滤规则
      type: "http",
      behavior: "classical",
      format: "text",
      interval: 86400,
      url: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/AdditionalFilter.list",
      path: "./ruleset/AdditionalFilter.list",
    },
    AdditionalCDNResources: {  // 附加CDN资源规则
      type: "http",
      behavior: "classical",
      format: "text",
      interval: 86400,
      url: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/AdditionalCDNResources.list",
      path: "./ruleset/AdditionalCDNResources.list",
    },
    Crypto: {  // 加密货币规则
      type: "http",
      behavior: "classical",
      format: "text",
      interval: 86400,
      url: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/Crypto.list",
      path: "./ruleset/Crypto.list",
    },
  },
  // 基础规则列表
  baseRules = [
    "RULE-SET,秋风广告规则,广告拦截",  // 广告拦截规则集
    "RULE-SET,AdditionalFilter,广告拦截",  // 附加过滤规则集
    "RULE-SET,SogouInput,搜狗输入法",  // 搜狗输入法规则集
    "DOMAIN-SUFFIX,truthsocial.com,Truth Social",  // Truth Social域名后缀
    "RULE-SET,StaticResources,静态资源",  // 静态资源规则集
    "RULE-SET,CDNResources,静态资源",  // CDN资源规则集
    "RULE-SET,AdditionalCDNResources,静态资源",  // 附加CDN资源规则集
    "RULE-SET,Crypto,Crypto",  // 加密货币规则集
    "RULE-SET,EHentai,E-Hentai",  // E-Hentai规则集
    "RULE-SET,TikTok,TikTok",  // TikTok规则集
    `RULE-SET,SteamFix,${PROXY_GROUPS.DIRECT}`,  // Steam修复规则集，使用直连
    `RULE-SET,GoogleFCM,${PROXY_GROUPS.DIRECT}`,  // Google FCM规则集，使用直连
    `DOMAIN,services.googleapis.cn,${PROXY_GROUPS.SELECT}`,  // Google API中国服务域名
    `GEOSITE,GOOGLE-PLAY@CN,${PROXY_GROUPS.DIRECT}`,  // Google Play中国站点，使用直连
    "GEOSITE,CATEGORY-AI-!CN,AI",  // 非中国AI类别站点
    "GEOSITE,TELEGRAM,Telegram",  // Telegram站点
    "GEOSITE,YOUTUBE,YouTube",  // YouTube站点
    "GEOSITE,NETFLIX,Netflix",  // Netflix站点
    "GEOSITE,SPOTIFY,Spotify",  // Spotify站点
    "GEOSITE,BAHAMUT,Bahamut",  // Bahamut站点
    "GEOSITE,BILIBILI,Bilibili",  // Bilibili站点
    `GEOSITE,MICROSOFT@CN,${PROXY_GROUPS.DIRECT}`,  // 微软中国站点，使用直连
    "GEOSITE,PIKPAK,PikPak",  // PikPak站点
    `GEOSITE,GFW,${PROXY_GROUPS.SELECT}`,  // GFW站点，使用选择代理
    `GEOSITE,CN,${PROXY_GROUPS.DIRECT}`,  // 中国站点，使用直连
    `GEOSITE,PRIVATE,${PROXY_GROUPS.DIRECT}`,  // 私有站点，使用直连
    "GEOIP,NETFLIX,Netflix,no-resolve",  // Netflix IP，不解析
    "GEOIP,TELEGRAM,Telegram,no-resolve",  // Telegram IP，不解析
    `GEOIP,CN,${PROXY_GROUPS.DIRECT}`,  // 中国IP，使用直连
    `GEOIP,PRIVATE,${PROXY_GROUPS.DIRECT}`,  // 私有IP，使用直连
    "DST-PORT,22,SSH(22端口)",  // 22端口SSH流量
    `MATCH,${PROXY_GROUPS.SELECT}`,  // 默认匹配规则，使用选择代理
  ];

// 构建规则列表的函数
// 参数e包含quicEnabled标志
function buildRules({ quicEnabled: e }) {
  const t = [...baseRules];  // 创建基础规则的副本
  // 如果未启用QUIC，在规则列表开头添加QUIC拒绝规则
  return e || t.unshift("AND,((DST-PORT,443),(NETWORK,UDP)),REJECT"), t;
}

// 嗅探器配置
const snifferConfig = {
  sniff: {
    TLS: { ports: [443, 8443] },    // TLS嗅探端口
    HTTP: { ports: [80, 8080, 8880] },  // HTTP嗅探端口
    QUIC: { ports: [443, 8443] },   // QUIC嗅探端口
  },
  "override-destination": !1,  // 不覆盖目标
  enable: !0,                  // 启用嗅探
  "force-dns-mapping": !0,     // 强制DNS映射
  "skip-domain": ["Mijia Cloud", "dlg.io.mi.com", "+.push.apple.com"],  // 跳过的域名
};

// 构建DNS配置的函数
function buildDnsConfig({ mode: e, fakeIpFilter: t }) {
  const o = {
    enable: !0,  // 启用DNS
    ipv6: ipv6Enabled,  // IPv6支持
    "prefer-h3": !0,  // 优先使用HTTP/3
    "enhanced-mode": e,  // 增强模式（redir-host或fake-ip）
    "default-nameserver": ["119.29.29.29", "223.5.5.5"],  // 默认DNS服务器
    nameserver: ["system", "223.5.5.5", "119.29.29.29", "180.184.1.1"],  // DNS服务器列表
    fallback: [  // 回退DNS服务器
      "quic://dns0.eu",
      "https://dns.cloudflare.com/dns-query",
      "https://dns.sb/dns-query",
      "tcp://208.67.222.222",
      "tcp://8.26.56.2",
    ],
    "proxy-server-nameserver": [  // 代理服务器DNS
      "https://dns.alidns.com/dns-query",
      "tls://dot.pub",
    ],
  };
  // 如果有fake-ip过滤器，添加到配置中
  return t && (o["fake-ip-filter"] = t), o;
}

// 两种DNS配置：redir-host模式和fake-ip模式
const dnsConfig = buildDnsConfig({ mode: "redir-host" }),
  dnsConfigFakeIp = buildDnsConfig({
    mode: "fake-ip",  // fake-ip模式
    fakeIpFilter: [  // fake-ip过滤器列表
      "geosite:private",           // 私有站点
      "geosite:connectivity-check", // 连接检查站点
      "geosite:cn",                // 中国站点
      "Mijia Cloud",               // 米家云
      "dig.io.mi.com",             // 小米域名
      "localhost.ptlogin2.qq.com", // QQ登录本地域名
      "*.icloud.com",              // iCloud域名
      "*.stun.*.*",                // STUN服务器
      "*.stun.*.*.*",                // STUN服务器（更长的模式）
    ],                              // fake-ip过滤器数组结束
  }),                               // dnsConfigFakeIp配置结束
  
// Geo数据URL配置
  geoxURL = {
    geoip:                          // GeoIP数据库URL
      "https://gcore.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat",
    geosite:                        // GeoSite数据库URL
      "https://gcore.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat",
    mmdb:                           // MaxMind数据库URL
      "https://gcore.jsdelivr.net/gh/Loyalsoldier/geoip@release/Country.mmdb",
    asn:                            // ASN数据库URL
      "https://gcore.jsdelivr.net/gh/Loyalsoldier/geoip@release/GeoLite2-ASN.mmdb",
  },
  
// 国家元数据配置
  countriesMeta = {
    香港: {                          // 香港配置
      pattern: "(?i)香港|港|HK|hk|Hong Kong|HongKong|hongkong|🇭🇰",  // 匹配模式
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png",  // 图标URL
    },
    澳门: {                          // 澳门配置
      pattern: "(?i)澳门|MO|Macau|🇲🇴",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Macao.png",
    },
    台湾: {                          // 台湾配置
      pattern: "(?i)台|新北|彰化|TW|Taiwan|🇹🇼",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png",
    },
    新加坡: {                        // 新加坡配置
      pattern: "(?i)新加坡|坡|狮城|SG|Singapore|🇸🇬",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Singapore.png",
    },
    日本: {                          // 日本配置
      pattern: "(?i)日本|川日|东京|大阪|泉日|埼玉|沪日|深日|JP|Japan|🇯🇵",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Japan.png",
    },
    韩国: {                          // 韩国配置
      pattern: "(?i)KR|Korea|KOR|首尔|韩|韓|🇰🇷",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Korea.png",
    },
    美国: {                          // 美国配置
      pattern: "(?i)美国|US|United States|🇺🇸",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_States.png",
    },
    加拿大: {                        // 加拿大配置
      pattern: "(?i)加拿大|Canada|CA|🇨🇦",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Canada.png",
    },
    英国: {                          // 英国配置
      pattern: "(?i)英国|United Kingdom|UK|伦敦|London|🇬🇧",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_Kingdom.png",
    },
    澳大利亚: {                      // 澳大利亚配置
      pattern: "(?i)澳洲|澳大利亚|AU|Australia|🇦🇺",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Australia.png",
    },
    德国: {                          // 德国配置
      pattern: "(?i)德国|DE|Germany|🇩🇪",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Germany.png",
    },
    法国: {                          // 法国配置
      pattern: "(?i)法国|FR|France|🇫🇷",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/France.png",
    },
    俄罗斯: {                        // 俄罗斯配置
      pattern: "(?i)俄罗斯|RU|Russia|🇷🇺",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Russia.png",
    },
    泰国: {                          // 泰国配置
      pattern: "(?i)泰国|TH|Thailand|🇹🇭",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Thailand.png",
    },
    印度: {                          // 印度配置
      pattern: "(?i)印度|IN|India|🇮🇳",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/India.png",
    },
    马来西亚: {                      // 马来西亚配置
      pattern: "(?i)马来西亚|马来|MY|Malaysia|🇲🇾",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Malaysia.png",
    },
  };

// 检查是否有低倍率节点的函数
function hasLowCost(e) {
  const t = /0\.[0-5]|低倍率|省流|大流量|实验性/i;  // 低倍率节点匹配模式
  return (e.proxies || []).some((e) => t.test(e.name));  // 检查是否有节点匹配模式
}

// 解析国家信息的函数
// 参数e：包含代理列表的对象
// 参数landingEnabled：落地节点是否启用
function parseCountries(e, landingEnabled) {
  const t = e.proxies || [],  // 获取代理列表
    o = /家宽|家庭|家庭宽带|商宽|商业宽带|星链|Starlink|落地/i,  // 落地节点匹配模式
    r = Object.create(null),  // 创建空对象用于统计
    n = {};                   // 存储国家正则表达式
  
  // 为每个国家创建正则表达式
  for (const [e, t] of Object.entries(countriesMeta))
    n[e] = new RegExp(t.pattern.replace(/^\(\?i\)/, ""), "i");  // 移除(?i)前缀并创建不区分大小写的正则
  
  // 遍历所有代理
  for (const e of t) {
    const t = e.name || "";  // 获取代理名称
    // 只有当landing启用时，才排除落地节点
    // 当landing为false时，不排除落地节点，让它们参与国家分组
    if (!landingEnabled || !o.test(t)) {  // 如果landing未启用，或者不是落地节点
      for (const [e, o] of Object.entries(n))  // 遍历所有国家正则
        if (o.test(t)) {     // 如果匹配国家模式
          r[e] = (r[e] || 0) + 1;  // 增加该国家的计数
          break;             // 匹配到一个国家后跳出内层循环
        }
    }
  }
  
  const s = [];
  // 将统计结果转换为数组
  for (const [e, t] of Object.entries(r)) s.push({ country: e, count: t });
  return s;
}

// 构建国家代理组的函数
function buildCountryProxyGroups({ countries: e, landing: t, loadBalance: o }) {
  const r = [],  // 代理组数组
    n = "0\\.[0-5]|低倍率|省流|大流量|实验性",  // 低倍率排除模式
    s = o ? "load-balance" : "url-test";  // 根据负载均衡标志选择代理组类型
  
  // 为每个国家创建代理组
  for (const l of e) {
    const e = countriesMeta[l];  // 获取国家元数据
    if (!e) continue;            // 如果元数据不存在则跳过
    
    const i = {
      name: `${l}节点`,          // 代理组名称
      icon: e.icon,              // 图标URL
      "include-all": !0,         // 包含所有代理
      filter: e.pattern,         // 包含过滤器（匹配国家模式）
      "exclude-filter": t        // 排除过滤器
        ? `(?i)家宽|家庭|家庭宽带|商宽|商业宽带|星链|Starlink|落地|${n}`  // 如果启用落地节点，排除落地节点和低倍率节点
        : n,                     // 否则只排除低倍率节点
      type: s,                   // 代理组类型
    };
    
    // 如果不是负载均衡模式，添加URL测试参数
    o ||
      Object.assign(i, {
        url: "https://cp.cloudflare.com/generate_204",  // 测试URL
        interval: 60,                                   // 测试间隔（秒）
        tolerance: 20,                                  // 容差（毫秒）
        lazy: !1,                                       // 不延迟测试
      }),
      r.push(i);  // 将代理组添加到数组
  }
  return r;
}

// 构建代理组的函数
function buildProxyGroups({
  landing: e,
  countries: t,
  countryProxyGroups: o,
  lowCost: r,
  defaultProxies: n,
  defaultProxiesDirect: s,
  defaultSelector: l,
  defaultFallback: i,
  allProxyNames: m,
}) {
  const a = t.includes("台湾"),    // 检查是否包含台湾
    c = t.includes("香港"),        // 检查是否包含香港
    p = t.includes("美国"),        // 检查是否包含美国
    u = e                          // 如果启用落地节点
      ? l.filter(                  // 过滤选择器列表
          (e) => e !== PROXY_GROUPS.LANDING && e !== PROXY_GROUPS.FALLBACK  // 排除落地节点和故障转移组
        )
      : [];                        // 否则为空数组
  
  return [
    {
      name: PROXY_GROUPS.SELECT,  // 选择代理组
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png",
      type: "select",             // 选择类型
      proxies: l,                 // 代理列表
    },
    {
      name: PROXY_GROUPS.MANUAL,  // 手动选择组
      icon: "https://gcore.jsdelivr.net/gh/shindgewongxj/WHATSINStash@master/icon/select.png",
      type: "select",
      proxies: m || [],           // 使用显式代理列表保持原始顺序
    },
    e                              // 如果启用落地节点
      ? {
          name: "前置代理",        // 前置代理组
          icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Area.png",
          type: "select",
          "include-all": !0,
          "exclude-filter":       // 排除过滤器
            "(?i)家宽|家庭|家庭宽带|商宽|商业宽带|星链|Starlink|落地",
          proxies: u,             // 代理列表
        }
      : null,
    e                              // 如果启用落地节点
      ? {
          name: PROXY_GROUPS.LANDING,  // 落地节点组
          icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Airport.png",
          type: "select",
          "include-all": !0,
          filter: "(?i)家宽|家庭|家庭宽带|商宽|商业宽带|星链|Starlink|落地",  // 包含过滤器
        }
      : null,
    {
      name: PROXY_GROUPS.FALLBACK,  // 故障转移组
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Bypass.png",
      type: "fallback",            // 故障转移类型
      url: "https://cp.cloudflare.com/generate_204",  // 测试URL
      proxies: i,                  // 代理列表
      interval: 180,               // 测试间隔（秒）
      tolerance: 20,               // 容差（毫秒）
      lazy: !1,                    // 不延迟测试
    },
    {
      name: "静态资源",            // 静态资源组
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Cloudflare.png",
      type: "select",
      proxies: n,                  // 默认代理列表
    },
    {
      name: "AI",                  // AI组
      icon: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/icons/chatgpt.png",
      type: "select",
      proxies: n,
    },
    {
      name: "Telegram",            // Telegram组
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Telegram.png",
      type: "select",
      proxies: n,
    },
    {
      name: "YouTube",             // YouTube组
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/YouTube.png",
      type: "select",
      proxies: n,
    },
    {
      name: "Bilibili",            // Bilibili组
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/bilibili.png",
      type: "select",
      proxies: a && c ? [PROXY_GROUPS.DIRECT, "台湾节点", "香港节点"] : s,  // 如果包含台湾和香港，使用特殊代理列表
    },
    {
      name: "Netflix",             // Netflix组
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netflix.png",
      type: "select",
      proxies: n,
    },
    {
      name: "Spotify",             // Spotify组
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Spotify.png",
      type: "select",
      proxies: n,
    },
    {
      name: "TikTok",              // TikTok组
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/TikTok.png",
      type: "select",
      proxies: n,
    },
    {
      name: "E-Hentai",            // E-Hentai组
      icon: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/icons/Ehentai.png",
      type: "select",
      proxies: n,
    },
    {
      name: "PikPak",              // PikPak组
      icon: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/icons/PikPak.png",
      type: "select",
      proxies: n,
    },
    {
      name: "Truth Social",        // Truth Social组
      icon: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/icons/TruthSocial.png",
      type: "select",
      proxies: p ? ["美国节点", PROXY_GROUPS.SELECT, PROXY_GROUPS.MANUAL] : n,  // 如果包含美国，使用特殊代理列表
    },
    {
      name: "Bahamut",             // Bahamut组
      icon: "https://cdn.jsdmirror.com/gh/Koolson/Qure@master/IconSet/Color/Bahamut.png",
      type: "select",
      proxies: a                   // 如果包含台湾
        ? [
            "台湾节点",            // 台湾节点优先
            PROXY_GROUPS.SELECT,
            PROXY_GROUPS.MANUAL,
            PROXY_GROUPS.DIRECT,
          ]
        : n,
    },
    {
      name: "Crypto",              // 加密货币组
      icon: "https://cdn.jsdmirror.com/gh/Koolson/Qure@master/IconSet/Color/Cryptocurrency_3.png",
      type: "select",
      proxies: n,
    },
    {
      name: "SSH(22端口)",         // SSH组
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Server.png",
      type: "select",
      proxies: n,
    },
    /*
    {
      name: "搜狗输入法",  // 搜狗输入法代理组
      icon: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/icons/Sougou.png",  // 搜狗输入法图标URL
      type: "select",  // 选择类型代理组
      proxies: [PROXY_GROUPS.DIRECT, "REJECT"],  // 代理列表：直连或拒绝
    },
    */
    {
      name: PROXY_GROUPS.DIRECT,  // 直连代理组
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Direct.png",  // 直连图标URL
      type: "select",  // 选择类型代理组
      proxies: ["DIRECT", PROXY_GROUPS.SELECT],  // 代理列表：直连或选择代理
    },
    {
      name: "广告拦截",  // 广告拦截代理组
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/AdBlack.png",  // 广告拦截图标URL
      type: "select",  // 选择类型代理组
      proxies: [PROXY_GROUPS.DIRECT,"REJECT", "REJECT-DROP"],  // 代理列表：直连、拒绝、拒绝并丢弃
    },
    r  // 检查是否有低倍率节点
      ? {  // 如果有低倍率节点，创建低倍率节点代理组
          name: PROXY_GROUPS.LOW_COST,  // 低倍率节点代理组名称
          icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Lab.png",  // 低倍率节点图标URL
          type: "url-test",  // URL测试类型代理组
          url: "https://cp.cloudflare.com/generate_204",  // 测试URL
          "include-all": !0,  // 包含所有代理
          filter: "(?i)0.[0-5]|低倍率|省流|大流量|实验性",  // 过滤器：匹配低倍率节点模式
        }
      : null,  // 如果没有低倍率节点，返回null
    ...o,  // 展开国家代理组数组
  ].filter(Boolean);  // 过滤掉数组中的null值
}
// 主函数 - 生成Clash配置
// 参数e：包含代理列表的输入对象
function main(e) {
  // 创建包含代理列表的对象
  const t = { proxies: e.proxies },
    // 解析国家信息，统计每个国家的节点数量（传递landing参数）
    o = parseCountries(t, landing),
    // 检查是否有低倍率节点
    r = hasLowCost(t),
    // 获取国家组名称（根据阈值过滤）
    n = getCountryGroupNames(o, countryThreshold),
    // 去除节点后缀，获取纯国家名称列表
    s = stripNodeSuffix(n),
    // 构建基础列表（默认代理列表、选择器列表等）
    {
      defaultProxies: l,          // 默认代理列表
      defaultProxiesDirect: i,    // 直连优先的默认代理列表
      defaultSelector: a,         // 默认选择器列表
      defaultFallback: c,         // 默认故障转移列表
    } = buildBaseLists({ landing: landing, lowCost: r, countryGroupNames: n }),
    // 定义allRegex：过滤落地节点和低倍率节点的正则表达式
    allRegex = /家宽|家庭|家庭宽带|商宽|商业宽带|星链|Starlink|落地|0\.[0-5]|低倍率|省流|大流量|实验性/i,
    // 提取所有代理名称，过滤掉落地节点和低倍率节点
    allProxies = (e.proxies || [])
      .filter((e) => !allRegex.test(e.name))
      .map((e) => e.name),
    // 构建国家代理组
    p = buildCountryProxyGroups({
      countries: s,               // 国家列表
      landing: landing,           // 落地节点标志
      loadBalance: loadBalance,   // 负载均衡标志
    }),
    // 构建所有代理组
    u = buildProxyGroups({
      landing: landing,           // 落地节点标志
      countries: s,               // 国家列表
      countryProxyGroups: p,      // 国家代理组
      lowCost: r,                 // 低倍率节点标志
      defaultProxies: l,          // 默认代理列表
      defaultProxiesDirect: i,    // 直连优先的默认代理列表
      defaultSelector: a,         // 默认选择器列表
      defaultFallback: c,         // 默认故障转移列表
      allProxyNames: allProxies,  // 所有代理名称（排除落地和低倍率节点）
    }),
    // 提取所有代理组的名称
    d = u.map((e) => e.name);
  
  // 添加GLOBAL代理组（包含所有其他代理组和所有代理节点）
  u.push({
    name: "GLOBAL",  // 全局代理组名称
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Global.png",  // 全局图标URL
    type: "select",     // 选择类型代理组
    proxies: [...d, ...allProxies],  // 代理列表：所有其他代理组的名称 + 所有代理节点
  });
  
  // 构建规则列表
  const g = buildRules({ quicEnabled: quicEnabled });
  
  // 返回完整的Clash配置对象
  return (
    // 如果启用完整配置，添加基本配置参数
    fullConfig &&
      Object.assign(t, {
        "mixed-port": 7890,           // 混合端口
        "redir-port": 7892,           // 重定向端口
        "tproxy-port": 7893,          // TProxy端口
        "routing-mark": 7894,         // 路由标记
        "allow-lan": !0,              // 允许局域网访问
        ipv6: ipv6Enabled,            // IPv6支持
        mode: "rule",                 // 规则模式
        "unified-delay": !0,          // 统一延迟测试
        "tcp-concurrent": !0,         // TCP并发
        "find-process-mode": "off",   // 进程查找模式关闭
        "log-level": "info",          // 日志级别：信息
        "geodata-loader": "standard", // Geo数据加载器：标准
        "external-controller": ":9999",  // 外部控制器端口
        "disable-keep-alive": !keepAliveEnabled,  // 禁用保持连接
        profile: { "store-selected": !0 },  // 配置文件：存储选择
      }),
    // 添加代理组、规则提供者、规则、嗅探器、DNS等配置
    Object.assign(t, {
      "proxy-groups": u,              // 代理组配置
      "rule-providers": ruleProviders,  // 规则提供者配置
      rules: g,                       // 规则列表
      sniffer: snifferConfig,         // 嗅探器配置
      dns: fakeIPEnabled ? dnsConfigFakeIp : dnsConfig,  // DNS配置（根据FakeIP标志选择）
      "geodata-mode": !0,             // Geo数据模式启用
      "geox-url": geoxURL,            // Geo数据URL配置
    }),
    t  // 返回最终的配置对象
  );
}
