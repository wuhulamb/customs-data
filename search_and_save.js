// 在浏览器控制台直接运行此脚本
// 遍历所有组合查询并保存结果到 JSON

window.stopSearch = false;

(function() {
  'use strict';

  function checkStop() {
    if (window.stopSearch) {
      throw new Error('🛑 用户中断查询');
    }
  }

  // ==================== 配置 ====================
  const IE_TYPES = [1, 0];        // 1:进口，0:出口
  const YEARS = [2021, 2022, 2023, 2024, 2025];
  const TRADE_PORTS = ['11','12','13','14','15','21','22','23','31','32','33','34','35','36','37','41','42','43','44','45','46','50','51','52','53','54','61','62','63','64','65'];

  const SELECT_TABLE_STATE = {
    2021: 2,
    2022: 2,
    2023: 2,
    2024: 2,
    2025: 1
  };

  const typeNames = { 1: 'import', 0: 'export' };
  const typeNameMap = { 1: '进口', 0: '出口' };
  const log = console.log.bind(console);

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function buildBody(iEType, year, port) {
    return new URLSearchParams({
      pageSize: 10,
      pageNum: 1,
      iEType: iEType,
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
      outerValue4: String(port),
      orderType: "CODE ASC DEFAULT",
      selectTableState: SELECT_TABLE_STATE[year],
      currentStartTime: 202408
    });
  }

  async function queryCount(iEType, year, port) {
    const body = buildBody(iEType, year, port);

    const res = await fetch("http://stats.customs.gov.cn/queryData/getQueryDataListByWhere", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest"
      },
      credentials: "include",
      body
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const span = doc.querySelector("p.c-666 span");

    if (span) {
      const total = parseInt(span.textContent.trim(), 10);
      return isNaN(total) ? 0 : total;
    }
    return 0;
  }

  async function main() {
    log('\n🔍 开始遍历查询...\n');

    const results = [];
    let totalCount = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const iEType of IE_TYPES) {
      for (const year of YEARS) {
        log(`\n===== ${typeNameMap[iEType]} ${year}年 =====\n`);

        for (const port of TRADE_PORTS) {
          checkStop();

          const task = {
            iEType,
            year,
            port,
            name: `${typeNames[iEType]}-${year}-${port}`
          };

          try {
            const count = await queryCount(iEType, year, port);
            task.count = count;
            task.status = 'success';
            totalRecords += count;
            successCount++;

            if (count > 0) {
              log(`  ${task.name}: ${count.toLocaleString()}条`);
            } else {
              log(`  ${task.name}: 0条`);
            }
          } catch (err) {
            task.status = 'error';
            task.error = err.message;
            errorCount++;
            log(`  ${task.name}: ❌ ${err.message}`);
          }

          results.push(task);
          totalCount++;

          await sleep(200);
        }
      }
    }

    // 最终保存完整结果（只保存一次）
    const summary = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalTasks: totalCount,
        success: successCount,
        errors: errorCount,
        totalRecords: totalRecords
      },
      data: results
    };

    saveJSON(summary, 'customs_data_status_full.json');
    log(`   📄 已保存：customs_data_status_full.json`);

    log(`\n\n✅ 查询完成！`);
    log(`   总任务数：${totalCount}`);
    log(`   成功：${successCount}`);
    log(`   错误：${errorCount}`);
    log(`   总记录数：${totalRecords.toLocaleString()}`);
    log(`   📄 已保存：customs_data_status_full.json`);
  }

  function saveJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  let totalRecords = 0;

  main().catch(err => {
    if (err.message.includes('中断')) {
      console.log('⚠️ 查询已中断');
      console.log('当前进度已保存到文件');
    } else {
      console.error('❌ 发生错误:', err);
    }
  });
})();