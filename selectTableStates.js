(async () => {
  const years = [2021, 2022, 2023, 2024, 2025];
  const selectTableStates = [0, 1, 2, 3, 4, 5];

  for (const year of years) {
    for (const selectTableState of selectTableStates) {
      console.log(`\n=== 正在查询：year=${year}, selectTableState=${selectTableState} ===`);

      const res = await fetch("http://stats.customs.gov.cn/queryData/downloadQueryData", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          pageSize: 10,
          iEType: 1,  // 1: 进口，0: 出口
          currencyType: "rmb",
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
          outerValue4: 13,
          orderType: "CODE ASC DEFAULT",
          selectTableState: selectTableState,
          currentStartTime: 202408
        })
      });

      // 1️⃣ 读取并处理编码（GBK）
      const buf = await res.arrayBuffer();
      const decoder = new TextDecoder("gbk");
      let csv = decoder.decode(buf);

      // 2️⃣ 去掉字段内部的换行符（关键🔥）
      csv = csv.replace(/"([^"]*)"/gs, match => {
        return match.replace(/\r?\n/g, "");
      });

      // 3️⃣ 按行拆分
      const lines = csv
        .split(/\r?\n/)
        .filter(line => line.trim() !== "");

      console.log(`总行数（含表头）: ${lines.length}, 数据行数：${lines.length - 1}`);

      // 可选：添加延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
})();
