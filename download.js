// 在浏览器控制台直接运行此脚本

// ⚠️ 在控制台输入 window.stopDownload = true 即可中断下载

window.stopDownload = false;

(function() {
  'use strict';

  // 监听中断标志，每步检查
  function checkStop() {
    if (window.stopDownload) {
      throw new Error('🛑 用户中断下载');
    }
  }

  // ==================== 配置 ====================
  const IE_TYPES = [1, 0];        // 1:进口，0:出口
  const YEARS = [2021, 2022, 2023, 2024, 2025];
  const MAX_ROWS = 10000;
  const DELAY_MS = 500;           // 请求间隔 (毫秒)

  // CSV 数据 - 请从文件复制粘贴第一列编码
  const TRADE_PORTS = ['11','12','13','14','15','21','22','23','31','32','33','34','35','36','37','41','42','43','44','45','46','50','51','52','53','54','61','62','63','64','65']
  const TRADE_PARTNERS = ['101','102','103','104','105','106','107','108','109','110','111','112','113','114','115','116','117','118','119','120','121','122','123','124','125','126','127','128','129','130','131','132','133','134','135','136','137','138','139','141','142','143','144','145','146','147','148','149','150','151','152','199','201','202','203','204','205','206','207','208','209','210','211','212','213','214','215','216','217','218','219','220','221','222','223','224','225','226','227','228','229','230','231','232','233','234','235','236','237','238','239','240','241','242','243','244','245','246','247','248','249','250','251','252','253','254','255','256','257','258','259','260','261','262','263','299','301','302','303','304','305','306','307','308','309','310','311','312','313','314','315','316','318','320','321','322','323','324','325','326','327','328','329','330','331','334','335','336','337','338','339','340','343','344','347','349','350','351','352','353','354','355','356','357','358','359','360','361','362','363','364','399','401','402','403','404','405','406','408','409','410','411','412','413','414','415','416','417','418','419','420','421','422','423','424','425','426','427','428','429','430','431','432','433','434','435','436','437','438','439','440','441','442','443','444','445','446','447','448','449','450','451','452','453','454','455','456','499','501','502','503','504','505','599','601','602','603','604','605','606','607','608','609','610','611','612','613','614','615','616','617','618','619','620','621','622','623','625','626','627','628','629','630','631','632','633','634','635','699','700','701','702']
  const TRADE_METHODS = ['10','11','12','13','14','15','16','19','20','22','23','25','27','30','31','33','34','35','39','41']

  const typeNames = { 1: 'import', 0: 'export' };
  const typeNameMap = { 1: '进口', 0: '出口' };
  const log = console.log.bind(console);
  const error = console.error.bind(console);

  // 延迟函数
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // selectTableState 配置
  const SELECT_TABLE_STATE = {
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

  // 构建请求体
  function buildBody(iEType, year, port, partners, methods) {
    return new URLSearchParams({
      pageSize: 10, // do not modify, it does not affect the actual page size but is required by the server
      iEType: iEType,
      currencyType: "rmb",
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

  // 查询记录数并返回 CSV 行数
  async function queryWithBody(body) {
    const res = await fetch("http://stats.customs.gov.cn/queryData/downloadQueryData", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const buf = await res.arrayBuffer();
    const decoder = new TextDecoder("gbk");
    let csv = decoder.decode(buf);
    csv = csv.replace(/"([^"]*)"/gs, match => {
      return match.replace(/\r?\n/g, "");
    });
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== "");
    return lines.length > 0 ? lines.length - 1 : 0;
  }

  // 下载 CSV 数据
  async function downloadData(iEType, year, port, partners, methods) {
    const body = buildBody(iEType, year, port, partners, methods);
    const res = await fetch("http://stats.customs.gov.cn/queryData/downloadQueryData", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const buf = await res.arrayBuffer();
    const decoder = new TextDecoder("gbk");
    let csv = decoder.decode(buf);

    // 移除引号内的换行符
    csv = csv.replace(/"[^"]*"/gs, m => m.replace(/[\r\n]+/g, ''));
    return csv;
  }

  // 保存 CSV 到本地
  function saveCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.csv';
    a.click();
    URL.revokeObjectURL(url);

    // 添加一个可见的提示元素
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

  // 递归二分切分处理
  async function processSplit(port, partnerList, methodList, iEType, year, prefix) {
    const body = buildBody(iEType, year, port, partnerList, methodList);
    const count = await queryWithBody(body);

    checkStop();

    if (count < MAX_ROWS && count > 0) {
      log(`  ↓ ${prefix}: ${(count).toLocaleString()}条`);
      const csv = await downloadData(iEType, year, port, partnerList, methodList);
      saveCSV(csv, prefix);
      return count;
    } else if (count === 0) {
      // add log for zero records
      log(`  ⚠️ ${prefix} 数据量为0`);
      return 0;
    } else if (partnerList.length === 1 && methodList.length === 1) {
      error(`  ⚠️ ${prefix} 数据量${count.toLocaleString()}超过${MAX_ROWS},无法再拆分`);
      return count;
    } else {
      let totalDownloaded = 0;

      // 优先按贸易伙伴二分
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
        // 改按贸易方式二分
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

  // 主函数
  async function main() {
    // 验证配置
    if (!TRADE_PORTS.length || !TRADE_PARTNERS.length || !TRADE_METHODS.length) {
      error('❌ 请先配置 TRADE_PORTS, TRADE_PARTNERS, TRADE_METHODS 数组！');
      error('请将 CSV 文件的第一列编码复制到对应数组中');
      return;
    }

    let totalRecords = 0;
    let fileCount = 0;

    log('\n🚀 开始下载...\n');

    for (const iEType of IE_TYPES) {
      for (const year of YEARS) {
        log(`\n===== ${typeNameMap[iEType]} ${year}年 =====\n`);

        for (const port of TRADE_PORTS) {
          const prefix = `${typeNames[iEType]}-${year}-${port}`;

          await processSplit(
            port,
            [...TRADE_PARTNERS],
            [...TRADE_METHODS],
            iEType,
            year,
            prefix
          );

          fileCount++;
          checkStop();
          await sleep(DELAY_MS);
        }
      }
    }

    log(`\n\n✅ 下载完成！`);
    log(`   总文件数：${fileCount}`);
    log(`   总记录数：${totalRecords.toLocaleString()}`);
  }

  // 执行
  main().catch(err => {
  if (err.message.includes('中断')) {
    console.log('⚠️ 下载已中断');
  } else {
    error('❌ 发生错误:', err);
  }
});
})();
