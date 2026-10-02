"""只导入原稿正文；原稿不修改。运行后人工复核 content/wiki.md。"""
from pathlib import Path
import re
import json
import hashlib

root = Path(__file__).resolve().parents[1]
source = (root.parent / "sufewiki.md").read_text(encoding="utf-8")
text = source.split("上财Wiki - 正文", 1)[1]
text = re.sub(r"(?m)^(#{1,6})[ \t]*\n(?:[ \t]*\n)*([^\n]+)", r"\1 \2", text)
text = re.sub(r"(?m)^#[ \t]*$", "", text)
text = text.replace("\r", "")
start = text.index("# 学校简介")
end = text.index("# 生活服务")
text = text[:start] + "# 学校简介\n\n上海财经大学，简称上财。\n\n本 Wiki 由学生共同维护，整理学习、生活与校园资源，方便同学查找信息。\n\n" + text[end:]
removals = [
    "这里可以写一点周边自行车门店，方便学生过去买，以及自行车的选购/停车/骑行建议",
    "到底什么情况会用到这条呢…？", "我不知道有哪些图书馆啊！",
    "自行查找宝贝们。哎算了我抄一篇公众号来吧", "❤️❤️❤️",
    "Q：这里需要点增补，比如每年总共有几场讲座，方便我们建立一个能翘几场的心理预期。另外，我们的新生导学课似乎并不在这六类中间。",
    "新生导学课也是讲座类:D", "讲座数量其实非常多…保守估计40+/年", "信息渠道见下",
    "待增补：二课活动信息入口/每年的经典二课活动推荐/新生相关二课学分福利",
]
for paragraph in removals:
    text = text.replace(paragraph, "")
text = text.replace("运动（这一条暂定按场馆来分类，需要慢慢补齐）", "运动场馆")
text = text.replace("# 羊毛优惠", "# 学生优惠")
text = text.replace("打开【上财门户】网页，在应用中心找到【全校培养计划】，接着选择自己的年级、学院、专业，就可以查看本专业的培养计划啦！", "在上财门户的「应用中心 → 全校培养计划」中，选择自己的年级、学院和专业，查看培养方案。")
text = text.replace("下载并打开上财微门户app，在【学业情况】一栏中找到自己专业培养计划规定的选修课学分。", "也可在上财微门户 App 的「学业情况」中查看专业培养计划及选修课学分要求。")
text = text.replace("包括献血XP 活动频率约1-2月开展一次 每次献血间隔至少6个月", "无偿献血也属于原稿记录的实践活动。活动安排、参与条件与学分认定，以当次学校通知为准。")
text = re.sub(r"参加无偿献血的同学可获得献血爱心礼包一份：[^\n]+", "原稿记录过无偿献血的营养补贴和第二课堂、奖学金加分；具体金额及加分规则待补充当年学校通知。", text)
text = text.replace("可见公众号【上海财经大学图书馆】", "信息渠道：微信公众号「上海财经大学图书馆」。")
text = text.replace("各分类具体计分规则可见", "#### 活动信息与计分规则\n\n各分类具体计分规则可见")
text = re.sub(r"([1-6])️⃣([^\n]+)", r"#### \1. \2", text)

meal_start = text.index("### 周边美食推荐")
meal_end = text.index("## 交通", meal_start)
meals = text[meal_start:meal_end]
categories = re.split(r"(?m)^[^\w\u4e00-\u9fff\n]*\s*(火锅|烤肉|日料 / 刺身|烧鸟 / 烤串|韩餐|川菜|江浙菜 / 粤菜 / 上海菜|汉堡 / 西餐|其他|烤鸭|甜点 / 小吃)\s*$", meals)
notes = {
    "猫儿滩": "火锅", "一绪": "自助火锅", "牛new": "自助火锅", "京元盛": "自助火锅",
    "和颐苑": "自助火锅；原稿记录排队较多", "海底捞": "适合聚餐；预算待核实", "北步园火锅": "有小吃", "朱光玉": "菜品选择较多",
    "凑凑": "火锅", "杨府蘸道火锅": "有牛肉菜品", "人生如沸": "火锅",
    "厚贞日式烤肉": "单点烤肉", "齐齐哈尔烤肉": "适合多人聚餐", "牛小新烤肉": "自助烤肉",
    "西塔老太太": "烤肉、蘸料", "首尔杯宝": "韩式烤肉", "鳗炉家": "烤肉", "牛鼎": "原稿推荐牛骨髓",
    "长白山烤肉": "适合团体聚餐", "大馥": "烤肉", "御殿场": "自助；原稿提到牛肋条", "炎韩友": "自助烤肉",
    "缓山": "自助；提供部分粤式熟食", "哥哥的深夜食堂": "烧鸟、刺身；原稿记录营业较晚、排队较多", "阿吾罗": "日料", "齐末": "日料自助",
    "万岛": "自助；原稿记录有 450 / 650 元档位", "虹料理": "自助；三文鱼、甜虾", "炎菜": "有多家门店", "金焰食堂": "日料",
    "人生一串": "烤串、鸡架", "鸟贵族": "烧鸟", "福八": "烧鸟",
    "阿吉特": "韩餐", "professor lee": "适合聚餐", "汤饭故事": "韩餐、炸猪排", "Day by Day": "韩餐", "kcoooking": "韩餐",
    "纯阳老酒馆": "川菜；原稿提到宫保鸡丁", "胖哥川菜馆": "川菜小馆", "蜀潭记": "川菜", "一川三水": "川菜",
    "锦楼": "中式菜肴", "江南小馆": "口味偏甜", "点都德": "广式点心", "大树餐厅": "中式菜肴", "鲜得来": "排骨年糕",
    "满陇山房": "江浙菜", "绿茶餐厅": "中式菜肴", "蓝蛙": "汉堡、西餐", "charlies": "汉堡；堂食、外卖", "popeyes": "炸鸡、汉堡", "罗福路": "西餐",
    "柏兰": "东南亚菜；原稿记录排队较多", "阿陆中东料理": "中东菜；原稿提到骆驼肉", "塔哈尔": "新疆菜", "黑盐": "印度菜", "AMINO": "墨西哥菜", "泰香疯": "烙锅",
    "小吊梨汤": "中式菜肴、烤鸭", "青年公社": "中式菜肴、烤鸭", "花悦庭": "烤鸭",
    "文汀蛋糕": "生日蛋糕", "糖纸": "甜点", "苏小柳": "点心", "阿祥嫂隆江猪脚饭": "原稿特指纪念路店",
}
output = ["### 周边餐饮参考", "", "> [!待核实] 以下为协作者提供的门店与预算记录，未附记录日期。价格、营业状态和具体位置待补充；表格中的描述仅供参考。", ""]
for category, chunk in zip(categories[1::2], categories[2::2]):
    output += [f"#### {category}", "", "| 门店 | 区域 | 原稿预算（元） | 参考信息 |", "| --- | --- | --- | --- |"]
    for line in chunk.splitlines():
        if "｜" not in line:
            continue
        cells = [part.strip() for part in line.split("｜")]
        name = cells[0]
        if name == "小马烧烤":
            continue  # 原稿明确说明未体验，仅有路过印象。
        budget_at = next(i for i, cell in enumerate(cells) if cell.startswith("¥"))
        area = cells[budget_at - 1]
        area = area.replace("字节区", "字节区（具体位置待补充）")
        budget = cells[budget_at].replace("¥", "")
        if name == "海底捞":
            budget = "待核实"
        output.append(f"| {name} | {area} | {budget} | {notes[name]} |")
    output.append("")
text = text[:meal_start] + "\n".join(output) + "\n" + text[meal_end:]

take_start = text.index("### 外卖柜")
take_end = text.index("### 周边餐饮参考")
text = text[:take_start] + """### 外卖柜

> [!待核实] 原稿记录了以下 5 处外卖柜。下单时请核对平台中的最新名称与实际位置。

| 位置 | 美团地址名称 / 其他平台填写参考 |
| --- | --- |
| 菜鸟驿站旁 | 美团：上海财经大学（国定路校区）东门 / 东2门外卖柜；其他平台：国定路门口菜鸟驿站旁边外卖柜 |
| 武东路门口 | 上海财经大学（武东路校区）西门外卖柜，图书馆对面 |
| 20号楼旁 | 美团：上海财经大学国定路西门门口3号外卖柜；其他平台：20号楼旁边外卖柜 |
| 武川路男生宿舍车棚 | 上海财经大学（武川路校区）外卖柜（车棚）或学生公寓西门外卖柜（车棚） |
| 27号楼与19号楼之间 | 上海财经大学（武东路校区）19号楼门口外卖柜 |

""" + text[take_end:]
text = text.replace("## 培养方案\n", "## 培养方案\n\n> [!待核实] 本章政策与学分数值来自协作者原稿，尚未附具体年级、文件出处和核对日期。办理前请以适用年级的培养方案及学校最新通知为准。\n")
for title in ["考试", "成绩", "转专业", "毕业"]:
    text = text.replace(f"## {title}\n", f"## {title}\n\n> [!待核实] 原稿规则待补充学校文件、适用年级和核对日期。\n")
text = re.sub(r"(?m)^---\s*$", "", text)
text = re.sub(r"\n[ \t]*\n(?:[ \t]*\n)+", "\n\n", text).strip() + "\n"
content = root / "content"
content.mkdir(exist_ok=True)
(content / "wiki.md").write_text(text, encoding="utf-8")

sections = []
stack = []
headings = list(re.finditer(r"(?m)^(#{1,4}) (.+)$", text))
for index, match in enumerate(headings):
    level = len(match[1])
    title = match[2]
    while stack and stack[-1][0] >= level:
        stack.pop()
    parent = stack[-1][1] if stack else None
    section_id = "s-" + hashlib.sha256(f"{parent}/{title}".encode()).hexdigest()[:12]
    end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
    sections.append({"id": section_id, "parentId": parent, "title": title, "body": text[match.end():end].strip(), "position": len(sections), "revision": 1, "updatedAt": "2026-10-02T00:00:00.000Z"})
    stack.append((level, section_id))
(content / "seed.json").write_text(json.dumps(sections, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"导入 {len(sections)} 个章节；仅正文，原稿保持不变。")
