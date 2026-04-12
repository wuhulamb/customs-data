// 在浏览器控制台直接运行此脚本

(function() {
  'use sharp';

  // selectTableState 配置
  const SELECT_TABLE_STATE = {
    2015: 2,
    2016: 2,
    2017: 2,
    2018: 2,
    2019: 2,
    2020: 2,
    2021: 2,
    2022: 2,
    2023: 2,
    2024: 2,
    2025: 1
  };

  // 查询数据
  async function queryData(iEType, year, port) {
    const res = await fetch("http://stats.customs.gov.cn/queryData/getQueryDataListByWhere", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest"
      },
      credentials: "include",
      body: new URLSearchParams({
        pageSize: 10,
        pageNum: 1,
        iEType: iEType,
        currencyType: "usd",
        year: year,
        startMonth: 1,
        endMonth: 12,
        monthFlag: "",
        unitFlag: true,
        unitFlag1: true,
        codeLength: 8,
        outerField1: "CODE_TS",
        outerField2: "ORIGIN_COUNTRY",
        outerField3: "TRADE_MODE",
        outerField4: "TRADE_CO_PORT",
        outerValue1: "",
        outerValue2: "",
        outerValue3: "",
        outerValue4: String(port),
        orderType: "CODE ASC DEFAULT",
        selectTableState: SELECT_TABLE_STATE[year],
        currentStartTime: 202408
      })
    });

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const span = doc.querySelector("p.c-666 span");

    if (span) {
      const total = parseInt(span.textContent.trim(), 10);
      return total;
    }
    return 0;
  }

  // 查询任务列表
  const tasks = [
    { name: 'import-2022-44', iEType: 1, year: 2022, port: '44' },
    { name: 'export-2021-35', iEType: 0, year: 2021, port: '35' },
    { name: 'export-2021-44', iEType: 0, year: 2021, port: '44' },
    { name: 'export-2022-31', iEType: 0, year: 2022, port: '31' },
    { name: 'export-2022-44', iEType: 0, year: 2022, port: '44' },
    { name: 'export-2023-36', iEType: 0, year: 2023, port: '36' },
    { name: 'export-2025-36', iEType: 0, year: 2025, port: '36' }
  ];

  async function main() {
    console.log('\n🔍 开始查询数据...\n');

    for (const task of tasks) {
      const total = await queryData(task.iEType, task.year, task.port);
      console.log(`${task.name}: ${total.toLocaleString()}条`);
    }

    console.log('\n✅ 查询完成\n');
  }

  main();
})();
