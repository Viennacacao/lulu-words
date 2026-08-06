export type DocumentBlockKind = "title" | "heading" | "meta" | "paragraph";

export interface DocumentBlock {
  id: string;
  kind: DocumentBlockKind;
  text: string;
}

export interface DocumentTemplate {
  id: "project-weekly" | "meeting-minutes" | "finance-report";
  name: string;
  fileName: string;
  revision: number;
  firstPage: {
    upper: DocumentBlock[];
    lower: DocumentBlock[];
  };
  continuation: DocumentBlock[];
}

const block = (id: string, kind: DocumentBlockKind, text: string): DocumentBlock => ({
  id,
  kind,
  text,
});

export const documentTemplates: DocumentTemplate[] = [
  {
    id: "project-weekly",
    name: "项目周报",
    fileName: "项目工作计划及重点事项说明.docx",
    revision: 1,
    firstPage: {
      upper: [
        block("weekly-title", "title", "关于下一阶段重点工作安排的通知"),
        block("weekly-meta", "meta", "各部门、各项目组："),
        block("weekly-intro", "paragraph", "为进一步提升项目执行效率，确保年度重点任务按照既定时间节点有序推进，现结合当前工作实际，对下一阶段工作安排说明如下。"),
        block("weekly-h1", "heading", "一、总体工作要求"),
        block("weekly-p1", "paragraph", "各责任部门应围绕重点目标，细化任务分工，加强过程协同，及时反馈执行过程中发现的问题；对未按期完成的事项，应及时说明原因并制定补救措施。"),
      ],
      lower: [
        block("weekly-h2", "heading", "二、关键讨论事项"),
        block("weekly-p2", "paragraph", "1．充分评估现有流程与系统衔接情况，保留必要的业务逻辑，按照计划完成后续整合工作。"),
        block("weekly-p3", "paragraph", "2．明确工作优先级与执行顺序，重要事项应形成闭环，并对阶段性成果进行统一复核。"),
        block("weekly-p4", "paragraph", "3．做好数据衔接和资料归档，确保相关记录完整、准确且具备可追溯性。"),
        block("weekly-h3", "heading", "三、后续工作安排"),
        block("weekly-p5", "paragraph", "各部门应于本周内完成任务分解，并根据实际进展持续更新工作计划。"),
      ],
    },
    continuation: [
      block("weekly-c-h1", "heading", "四、工作保障措施"),
      block("weekly-c-p1", "paragraph", "建立定期沟通机制，对关键节点和风险事项进行跟踪，确保各项工作有序开展。各项目负责人应汇总本周进度、遗留事项及下一步安排，并在例会前完成材料更新。"),
      block("weekly-c-p2", "paragraph", "对需要跨部门协调的事项，应明确牵头人与完成时间，避免因信息不同步影响整体交付。"),
      block("weekly-c-h2", "heading", "五、进度反馈要求"),
      block("weekly-c-p3", "paragraph", "进度反馈应以事实和数据为依据，重点说明目标完成情况、当前风险和资源需求。已完成事项同步归档，未完成事项注明原因和调整后的时间节点。"),
      block("weekly-c-p4", "paragraph", "本通知自发布之日起执行，由项目管理办公室负责解释并汇总实施情况。"),
    ],
  },
  {
    id: "meeting-minutes",
    name: "会议纪要",
    fileName: "专项工作协调会议纪要.docx",
    revision: 1,
    firstPage: {
      upper: [
        block("meeting-title", "title", "专项工作协调会议纪要"),
        block("meeting-meta", "meta", "会议时间：本周一上午　会议地点：第一会议室"),
        block("meeting-p1", "paragraph", "会议听取了各工作组近期进展汇报，并围绕关键节点、资源安排和跨部门协作事项进行了集中讨论。"),
        block("meeting-h1", "heading", "一、会议总体情况"),
        block("meeting-p2", "paragraph", "各项工作总体推进平稳，核心任务已进入联调和验收准备阶段。会议要求继续保持信息同步，及时处理影响交付的风险事项。"),
      ],
      lower: [
        block("meeting-h2", "heading", "二、议定事项"),
        block("meeting-p3", "paragraph", "1．产品组于本周三前确认需求范围，形成最终版本清单。"),
        block("meeting-p4", "paragraph", "2．技术组按优先级完成联调，对阻塞问题建立单独跟踪记录。"),
        block("meeting-p5", "paragraph", "3．运营组提前准备上线说明与内部培训材料。"),
        block("meeting-h3", "heading", "三、责任分工"),
        block("meeting-p6", "paragraph", "各负责人按照会议确定的时间节点推进，重大变化须在当日同步。"),
      ],
    },
    continuation: [
      block("meeting-c-h1", "heading", "四、风险与待协调事项"),
      block("meeting-c-p1", "paragraph", "当前风险主要集中在历史数据校验和外部接口响应时间。相关工作组需准备替代方案，并在每日同步会上更新处理进展。"),
      block("meeting-c-p2", "paragraph", "涉及其他部门支持的事项由项目经理统一协调，需求方应一次性提供完整背景和期望完成时间。"),
      block("meeting-c-h2", "heading", "五、下次会议安排"),
      block("meeting-c-p3", "paragraph", "下次会议重点检查本纪要所列事项的完成情况。各负责人须提前更新任务状态，并准备需要会议决策的材料。"),
    ],
  },
  {
    id: "finance-report",
    name: "财务报告",
    fileName: "月度经营及财务分析报告.docx",
    revision: 1,
    firstPage: {
      upper: [
        block("finance-title", "title", "月度经营及财务分析报告"),
        block("finance-meta", "meta", "报告期间：本月　编制部门：财务管理部"),
        block("finance-p1", "paragraph", "本月经营工作总体保持稳定，重点项目按照计划推进，收入结构与成本投入处于预算控制范围内。现将主要情况报告如下。"),
        block("finance-h1", "heading", "一、总体经营情况"),
        block("finance-p2", "paragraph", "核心业务收入保持平稳，重点客户续约情况良好。各部门持续推进费用精细化管理，资源使用效率较上月有所改善。"),
      ],
      lower: [
        block("finance-h2", "heading", "二、主要指标分析"),
        block("finance-p3", "paragraph", "1．营业收入按计划确认，收入进度与年度预算基本一致。"),
        block("finance-p4", "paragraph", "2．项目直接成本保持稳定，新增投入主要用于产品升级。"),
        block("finance-p5", "paragraph", "3．期间费用执行合理，差旅及采购支出均履行审批程序。"),
        block("finance-h3", "heading", "三、预算执行情况"),
        block("finance-p6", "paragraph", "预算执行总体可控，暂无需要调整年度预算的重大事项。"),
      ],
    },
    continuation: [
      block("finance-c-h1", "heading", "四、重点事项说明"),
      block("finance-c-p1", "paragraph", "部分项目回款周期较计划略有延后，业务部门已与客户确认付款安排，预计不会对日常经营产生重大影响。"),
      block("finance-c-p2", "paragraph", "新增采购事项将结合实际交付节奏分批执行，财务部门继续跟踪合同、验收及付款资料的完整性。"),
      block("finance-c-h2", "heading", "五、下月工作建议"),
      block("finance-c-p3", "paragraph", "持续跟踪重点项目回款与成本执行情况，加强预算偏差预警；同时完善经营数据口径，提高月度分析材料的及时性与准确性。"),
    ],
  },
];

export function getDocumentTemplate(templateId: DocumentTemplate["id"]) {
  return documentTemplates.find((template) => template.id === templateId) ?? documentTemplates[0];
}
