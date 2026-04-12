// 在浏览器控制台直接运行此脚本
// 重爬取之前失败的数据（502/504 错误）

window.stopDownload = false;

(function() {
  'use strict';

  function checkStop() {
    if (window.stopDownload) {
      throw new Error('🛑 用户中断下载');
    }
  }

  // ==================== 配置 ====================
  const RETRY_TASKS = [
    { iEType: 1, year: 2025, port: '44' },  // import-2025-44: 138,361条
  ];

  const TRADE_PARTNERS = ['101','102','103','104','105','106','107','108','109','110','111','112','113','114','115','116','117','118','119','120','121','122','123','124','125','126','127','128','129','130','131','132','133','134','135','136','137','138','139','141','142','143','144','145','146','147','148','149','150','151','152','199','201','202','203','204','205','206','207','208','209','210','211','212','213','214','215','216','217','218','219','220','221','222','223','224','225','226','227','228','229','230','231','232','233','234','235','236','237','238','239','240','241','242','243','244','245','246','247','248','249','250','251','252','253','254','255','256','257','258','259','260','261','262','263','299','301','302','303','304','305','306','307','308','309','310','311','312','313','314','315','316','318','320','321','322','323','324','325','326','327','328','329','330','331','334','335','336','337','338','339','340','343','344','347','349','350','351','352','353','354','355','356','357','358','359','360','361','362','363','364','399','401','402','403','404','405','406','408','409','410','411','412','413','414','415','416','417','418','419','420','421','422','423','424','425','426','427','428','429','430','431','432','433','434','435','436','437','438','439','440','441','442','443','444','445','446','447','448','449','450','451','452','453','454','455','456','499','501','502','503','504','505','599','601','602','603','604','605','606','607','608','609','610','611','612','613','614','615','616','617','618','619','620','621','622','623','625','626','627','628','629','630','631','632','633','634','635','699','700','701','702'];
  const TRADE_METHODS = ['10','11','12','13','14','15','16','19','20','22','23','25','27','30','31','33','34','35','39','41'];

  const MAX_ROWS = 10000;
  const DELAY_MS = 500;
  const RETRY_TIMES = 3;        // 每个请求重试次数
  const RETRY_DELAY_MS = 3000;  // 重试间隔

  const typeNames = { 1: 'import', 0: 'export' };
  const typeNameMap = { 1: '进口', 0: '出口' };
  const log = console.log.bind(console);

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

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

  function buildBody(iEType, year, port, partners, methods) {
    return new URLSearchParams({
      pageSize: 10,
      iEType: iEType,
      currencyType: "usd",
      year: year,
      startMonth: 1,
      endMonth: 12,
      monthFlag: "",
      unitFlag: "true",
      unitFlag1: "true",
      codeLength: 8,
      outerField1: "CODE_TS",
      outerField2: "ORIGIN_COUNTRY",
      outerField3: "TRADE_MODE",
      outerField4: "TRADE_CO_PORT",
      outerValue1: "",
      outerValue2: partners.join(','),
      outerValue3: methods.join(','),
      outerValue4: String(port),
      orderType: "CODE ASC DEFAULT",
      selectTableState: SELECT_TABLE_STATE[year],
      currentStartTime: 202408
    });
  }

  // 查询接口：获取数据量（用于验证下载数据完整性）
  async function queryCount(iEType, year, port, partners, methods) {
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
        outerValue2: partners.join(','),
        outerValue3: methods.join(','),
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
      return parseInt(span.textContent.trim(), 10);
    }
    return 0;
  }

  async function queryWithBody(body) {
    for (let attempt = 1; attempt <= RETRY_TIMES; attempt++) {
      try {
        const res = await fetch("http://stats.customs.gov.cn/queryData/downloadQueryData", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body
        });

        if (res.status === 502 || res.status === 504) {
          if (attempt < RETRY_TIMES) {
            log(`  ⏳ 请求失败 (HTTP ${res.status}), 第 ${attempt}/${RETRY_TIMES} 次重试...`);
            await sleep(RETRY_DELAY_MS);
            continue;
          } else {
            throw new Error(`HTTP ${res.status} 错误，已重试 ${RETRY_TIMES} 次`);
          }
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} 错误`);
        }

        const buf = await res.arrayBuffer();
        const decoder = new TextDecoder("gbk");
        let csv = decoder.decode(buf);
        csv = csv.replace(/"([^"]*)"/gs, match => {
          return match.replace(/\r?\n/g, "");
        });
        const lines = csv.split(/\r?\n/).filter(line => line.trim() !== "");
        return lines.length > 0 ? lines.length - 1 : 0;
      } catch (err) {
        if (attempt < RETRY_TIMES) {
          log(`  ⏳ 请求异常，第 ${attempt}/${RETRY_TIMES} 次重试... (${err.message})`);
          await sleep(RETRY_DELAY_MS);
        } else {
          throw err;
        }
      }
    }
  }

  async function downloadData(iEType, year, port, partners, methods) {
    const body = buildBody(iEType, year, port, partners, methods);

    for (let attempt = 1; attempt <= RETRY_TIMES; attempt++) {
      try {
        const res = await fetch("http://stats.customs.gov.cn/queryData/downloadQueryData", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body
        });

        if (res.status === 502 || res.status === 504) {
          if (attempt < RETRY_TIMES) {
            log(`  ⏳ 下载失败 (HTTP ${res.status}), 第 ${attempt}/${RETRY_TIMES} 次重试...`);
            await sleep(RETRY_DELAY_MS);
            continue;
          } else {
            throw new Error(`HTTP ${res.status} 错误，已重试 ${RETRY_TIMES} 次`);
          }
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} 错误`);
        }

        const buf = await res.arrayBuffer();
        const decoder = new TextDecoder("gbk");
        let csv = decoder.decode(buf);
        csv = csv.replace(/"[^"]*"/gs, m => m.replace(/[\r\n]+/g, ''));
        return csv;
      } catch (err) {
        if (attempt < RETRY_TIMES) {
          log(`  ⏳ 下载异常，第 ${attempt}/${RETRY_TIMES} 次重试... (${err.message})`);
          await sleep(RETRY_DELAY_MS);
        } else {
          throw err;
        }
      }
    }
  }

  function saveCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.csv';
    a.click();
    URL.revokeObjectURL(url);

    const notice = document.createElement('div');
    notice.style.cssText = `
      position: fixed; bottom: 100px; right: 20px;
      background: #4caf50; color: white; padding: 10px 20px;
      border-radius: 8px; z-index: 9999; font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    notice.textContent = '↓ 已下载：' + filename + '.csv';
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 3000);
  }

  async function processSplit(port, partnerList, methodList, iEType, year, prefix) {
    const body = buildBody(iEType, year, port, partnerList, methodList);
    const count = await queryWithBody(body);

    checkStop();

    if (count < MAX_ROWS && count > 0) {
      log(`  ↓ ${prefix}: ${(count).toLocaleString()}条`);
      const csv = await downloadData(iEType, year, port, partnerList, methodList);

      saveCSV(csv, prefix);

      // 使用查询接口验证数据量
      const queryCountResult = await queryCount(iEType, year, port, partnerList, methodList);
      const diff = count - queryCountResult;
      if (queryCountResult === count) {
        log(`     ✓ 数据验证通过：下载 ${count.toLocaleString()} 条，查询 ${queryCountResult.toLocaleString()} 条`);
      } else {
        log(`     ✗ 数据不一致：下载 ${count.toLocaleString()} 条，查询 ${queryCountResult.toLocaleString()} 条，差异 ${diff > 0 ? '+' : ''}${diff}`);
      }
      return count;
    } else if (count === 0) {
      log(`  ⚠️ ${prefix} 数据量为 0`);
      return 0;
    } else if (partnerList.length === 1 && methodList.length === 1) {
      log(`  ⚠️ ${prefix} 数据量${count.toLocaleString()}超过${MAX_ROWS},无法再拆分`);
      return count;
    } else {
      let totalDownloaded = 0;

      if (partnerList.length > 1) {
        const mid = Math.floor(partnerList.length / 2);
        totalDownloaded += await processSplit(
          port, partnerList.slice(0, mid), methodList,
          iEType, year, `${prefix}_p1-${mid}`
        );
        totalDownloaded += await processSplit(
          port, partnerList.slice(mid), methodList,
          iEType, year, `${prefix}_p${mid + 1}-${partnerList.length}`
        );
      } else {
        const mid = Math.floor(methodList.length / 2);
        totalDownloaded += await processSplit(
          port, partnerList, methodList.slice(0, mid),
          iEType, year, `${prefix}_m1-${mid}`
        );
        totalDownloaded += await processSplit(
          port, partnerList, methodList.slice(mid),
          iEType, year, `${prefix}_m${mid + 1}-${methodList.length}`
        );
      }

      return totalDownloaded;
    }
  }

  async function main() {
    log('\n🔁 开始重爬取失败数据...\n');

    let totalRecords = 0;
    let taskCount = 0;

    for (const task of RETRY_TASKS) {
      const { iEType, year, port } = task;
      const prefix = `${typeNames[iEType]}-${year}-${port}`;

      log(`\n===== ${typeNameMap[iEType]} ${year}年 港口${port} =====\n`);

      await processSplit(
        port,
        [...TRADE_PARTNERS],
        [...TRADE_METHODS],
        iEType,
        year,
        prefix
      );

      taskCount++;
      checkStop();
      await sleep(DELAY_MS);
    }

    log(`\n\n✅ 重爬取完成！共处理 ${taskCount} 个任务`);
  }

  main().catch(err => {
    if (err.message.includes('中断')) {
      console.log('⚠️ 下载已中断');
    } else {
      console.error('❌ 发生错误:', err);
    }
  });
})();
