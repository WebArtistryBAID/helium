export const TRANSLATE_LITERAL = `
在上传的附件中，有一篇**中文 Markdown** 校园新闻: 第一行是原标题（已以 \`#\` 开头给出），其后是正文 Markdown。你的任务是**忠实、流畅地翻译为英文**，并以**JSON** 返回结构化结果。

## 翻译要求
- **英文为唯一语言**: 输出中**不能出现任何中文**（含括号内注释、术语原文等）。  
- **标题与正文**: 将给定的中文标题翻译为英文并放入 \`title\`；**不要**把主标题写入 \`content\`。如果标题过长，可以适度缩写，但必须保留原意。正文禁止添加或删除。
- **Markdown 结构**: 保留正文中的 Markdown 结构（段落、列表、加粗、斜体、引用、代码块、链接、图片等）。  
- **图片与特殊符号**:   
  - 不要修改或翻译图片的 Markdown 语法与链接（如 \`![]()\`）。  
  - 不要翻译出现的字面 \`\\n\`（表示换行的转义），保持其原样。  
- **文体与细节**:   
  - 符合**校园新闻报道**的常见英文体例，语法正确，大小写与标点规范。  
  - 中国式的表达，重写为符合原意的英文表达。
  - **专有名词与术语**: 严格遵循下方“专有名词对照表”；若原文与对照表不同，以对照表为准。  
  - **中文人名**: 采用汉语拼音，**姓在前、名在后**（如“张丹萌”→“Zhang Danmeng”），不使用音译英文名。吕姓翻译为 Lyu。
  - 合理处理量词与日期表达，避免直译僵硬。

## 输出字段
- \`content\`: 英文正文（不含主标题），保持 Markdown 结构与图片。  
- \`title\`: 英文标题。    

## 输出格式（仅输出 JSON 对象；不要使用代码块围栏）
{
  "content": "...Markdown in English...",
  "title": "English Title"
}
必须直接输出文本 JSON 对象，禁止生成文件。

## 重要禁止项
- 不要输出任何解释性文字、提示或多余字符。  
- 不要在 JSON 外再包裹 Markdown/代码围栏。  
- 不要混用中英文本；**只输出英文内容**（除非为图片链接、\`\\n\` 字面量等要求保留的非英文字符）。

专有名词:
北京中学 Beijing Academy
北京中学国际部 Beijing Academy International Division (尽量缩写为 BAID)
北中外籍人员子女学校: International School of Beijing Academy (尽量缩写为 ISBA)
毕业生故事: #GraduateStory
毕业生特辑: #GraduateFeature
喜报: #Congrats
BAID 故事: #BAIDStory
BAID 暑期实践: #SummerAtBAID
BAID 暑期生活: #SummerAtBAID
北中国际: BAID
北中学子: BAer
北中国际学子: BAIDer
BA 大讲堂: BA Lectures
北中小讲师: BAID Speaker
世界大课堂: BA Global Classroom
阅历课程: Experiential Program
北京文化探究: Beijing Cultural Exploration
职业体验: Career Experiences
英才学者: Elite Scholar
世界因我更美好: Better Me, Better World
仁、智、勇、乐: Humanity, Wisdom, Courage, Happiness
和而不同 乐在其中: Harmony in Diversity, Joy in Learning
学会学习 学会共处 学会创新 学会生活: Learning to Acquire, Learning to Coexist, Learning to Pioneer, Learning to Live
京领: KingLead
京西学校: Western Academy of Beijing
社团: Student Club
选修课: Electives
年度人物: Student of the Year
月度人物: Student of the Month
周慧: Zhou Hui
慧校: Ms. Zhou (Principal Zhou, 如果适合的话)
校长特别奖: Principal's Special Award
学科周: Subject Week
国际风情周: International Theme Week
校友联络处: Alumni Association
中秋诗会: Zhongqiu Poem Festival
大地课程: Nature Exploration
语文 (指课程): Chinese Literature
通用技术 (指课程): General Technologies
信息技术 (指课程): Information Technologies
综合英语 (指课程): Integrated English
文学与写作 (指课程): Literature
整本书阅读 (指课程): Guided Reading
戏剧 (指课程): Drama
专题数学 (指课程): Integrated Mathematics
高阶数学 (指课程): Advanced Mathematics
高阶经济 (指课程): Advanced Economics
高阶物理 (指课程): Advanced Physics
沟通技能 (指课程): Communication Skills
学术写作 (指课程): Academic Writing
跨文化交际 (指课程): Intercultural Communications
人文社科 (指课程): Humanities Course Set (必须包含 Course Set)，注意禁止出现 AP European History、AP US History、Pre-AP World History、AP Human Geography 等历史类、政治类课程名称
EOT 经济竞赛 (指课程): Economics Olympiad Team
植物知道生命的答案 (指课程): Plants Know the Truth of Life
「丝绸之路」之跨学科探索 (指课程): Silk Road Exploration
近现代物理 (指课程): Modern Physics
版画 (指课程): Printmaking
升学指导: College Counseling
班会: Homeroom
戏剧节: Drama Festival
北中好声音: Sing! BA
北中杯: BA Cup
北中小舞台: BAID's Got Talent
露营: Camping
`

export const SANITIZE_LITERAL = `
在上传的附件中，有一段**中文 Markdown** 文本，由微信公众号内容转换而来。请对其进行**清理与结构化输出**，并按以下要求返回**JSON**: 

## 任务
1) **去除装饰性元素**: 删除与正文无关的装饰文字、页眉/页脚、水印、作者名片、引导关注/点赞/转发等提示，删除文章主标题、公众号名称与日期等版头信息。  
2) **保留正文与图片**: 正文中的图片属于内容的一部分，需要保留其 **Markdown 图片语法**。  
3) **规范化与排版**: 在不改变原意的前提下，适度改善排版 (如合理添加小标题、列表、加粗等)，但**不要把文章主标题作为正文标题**加入到 content 中。
4) **空格**: 在中文与英文、数字之间添加空格 (如"BA大讲堂"改为"BA 大讲堂")，但不要在纯中文或纯英文词组内添加空格。

## 图片处理
- 删除所有 **SVG** 与 **GIF** 图片。
- 删除这些图片文件: {{IMAGE_BLACKLIST}}

## 提取字段
- **title**: 从原文中提取的文章标题 (不出现在 content 内)。注意，必须在中文与英文、数字之间添加空格。
- **date**: 从文本**开头部分**提取的日期，格式为 yyyy-MM-dd。
- **content**: 清理与排版后的 Markdown 正文 (不含主标题；保留合规图片的 Markdown 语法与其他结构)。注意，必须在中文与英文、数字之间添加空格。

## 输出格式（必须是一个 JSON 对象）
{
  "content": "...Markdown...",
  "title": "文章标题",
  "date": "yyyy-MM-dd"
}
**仅输出 JSON，不要包含解释或多余文本。**
必须直接输出文本 JSON 对象，禁止生成文件。
在处理前，先根据以上规则完成图片筛除与链接前缀替换，再进行字段提取与排版。
`

export const NOTIFICATION_LITERAL = `**文章已下载完毕，请检查以下内容，检查后请删除本段文字:**
1. 是否有内容缺失，排版错误? 请在 "预览" 中检查，中文和英文内容都需要检查。
2. 部分文内图片由于微信限制无法自动下载，请手动添加。
3. 请添加文章封面图。
4. 中文与英文、中文与数字之间需要添加空格。
5. 英文翻译版检查专有名词。
6. 由于 AI 问题，英文翻译版可能存在遗留的中文，请检查。

`

export const ENGLISH_TRANSLATION_LITERAL = `

*This AI translation is provided for reference only. Please verify with original Chinese version.*`
