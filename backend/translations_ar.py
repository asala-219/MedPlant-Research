"""
Arabic version of the ethnomedicinal dataset.

The English CSV is the system of record. This module holds the Arabic
counterpart of every *human-readable* field and writes it into the ``*_ar``
columns so both languages live in the same rows and stay searchable.

Scientific names, phytochemical names and IMPPAT identifiers are deliberately
left untranslated — botanical binomials and chemical nomenclature are used in
their Latin form in Arabic scientific writing too.

Plant-level entries are keyed by scientific name because that is the stable,
human-readable identifier; row ids shift whenever the DB is rebuilt from CSV.
"""

import re
import sqlite3


# ---------------------------------------------------------------------------
# Medical conditions
# ---------------------------------------------------------------------------

CONDITIONS_AR: dict[str, str] = {
    "Acne / Pimples": "حبّ الشباب / البثور",
    "Allergy": "الحساسية",
    "Antimicrobial": "مضاد للميكروبات",
    "Antioxidant": "مضاد للأكسدة",
    "Appetite disorders": "اضطرابات الشهية",
    "Asthma": "الربو",
    "Bites & Stings": "اللدغات واللسعات",
    "Bleeding / Hemorrhage": "النزيف",
    "Bone / Fracture": "العظام والكسور",
    "Cancer": "السرطان",
    "Constipation": "الإمساك",
    "Cough / Expectorant": "السعال / طارد للبلغم",
    "Diabetes": "السكري",
    "Diarrhea": "الإسهال",
    "Digestive disorders": "اضطرابات الهضم",
    "Diuretic uses": "مدرّ للبول",
    "Dizziness / Vertigo": "الدوخة / الدوار",
    "Ear infections": "التهابات الأذن",
    "Edema / Swelling": "الوذمة / التورّم",
    "Eye disorders": "أمراض العين",
    "Fever": "الحمّى",
    "General tonic": "مقوٍّ عام",
    "Headache": "الصداع",
    "Hemorrhoids": "البواسير",
    "Hypertension": "ارتفاع ضغط الدم",
    "Inflammation": "الالتهاب",
    "Kidney disorders": "أمراض الكلى",
    "Leishmaniasis": "داء الليشمانيات",
    "Liver diseases": "أمراض الكبد",
    "Malaria": "الملاريا",
    "Menstrual disorders": "اضطرابات الدورة الشهرية",
    "Mental health": "الصحة النفسية",
    "Nausea / Vomiting": "الغثيان / القيء",
    "Oral / Dental": "الفم والأسنان",
    "Pain relief": "تسكين الألم",
    "Parasitic infections": "الإصابات الطفيلية",
    "Respiratory disorders": "أمراض الجهاز التنفسي",
    "Rheumatism / Arthritis": "الروماتيزم / التهاب المفاصل",
    "Skin disorders": "الأمراض الجلدية",
    "Stomach ailments": "أمراض المعدة",
    "Toothache": "ألم الأسنان",
    "Ulcers": "القرحة",
    "Urinary disorders": "اضطرابات المسالك البولية",
    "Wound healing": "التئام الجروح",
}


# ---------------------------------------------------------------------------
# Botanical families
# ---------------------------------------------------------------------------

FAMILIES_AR: dict[str, str] = {
    "Acanthaceae": "الأقنثية",
    "Aizoaceae": "الأيزونية",
    "Amaranthaceae": "القطيفية",
    "Apiaceae": "الخيمية",
    "Apocynaceae": "الدفلية",
    "Arecaceae": "النخيلية",
    "Aristolochiaceae": "الزراوندية",
    "Asphodelaceae": "الأسفودلية",
    "Asteraceae": "النجمية",
    "Boraginaceae": "الحمحمية",
    "Brassicaceae": "الصليبية",
    "Burseraceae": "البخورية",
    "Cannabinaceae": "القنبية",
    "Capparaceae": "الكبرية",
    "Caricaceae": "البباوية",
    "Caryophyllaceae": "القرنفلية",
    "Cleomaceae": "الكليومية",
    "Convolvulaceae": "اللبلابية",
    "Cucurbitaceae": "القرعية",
    "Cupressaceae": "السروية",
    "Cyperaceae": "السعدية",
    "Ephedraceae": "العلندية",
    "Euphorbiaceae": "الفربيونية",
    "Fabaceae": "البقولية",
    "Juglandaceae": "الجوزية",
    "Labiatae": "الشفوية",
    "Lamiaceae": "الشفوية",
    "Lauraceae": "الغارية",
    "Laraceae": "الغارية",
    "Leguminosae": "البقولية",
    "Liliaceae": "الزنبقية",
    "Lilliaceae": "الزنبقية",
    "Lythraceae": "الحنائية",
    "Malpighiaceae": "المالبيغية",
    "Malvaceae": "الخبازية",
    "Menispermaceae": "المنيسبرمية",
    "Molluginaceae": "المولوجينية",
    "Moraceae": "التوتية",
    "Moringaceae": "البانية",
    "Myrtaceae": "الآسية",
    "Oleaceae": "الزيتونية",
    "Orobanchaceae": "الهالوكية",
    "Oxalidaceae": "الحماضية",
    "Papaveraceae": "الخشخاشية",
    "Phyllanthaceae": "الفيلانتية",
    "Plantaginaceae": "لسان الحملية",
    "Plumbaginaceae": "الرصاصية",
    "Polygalaceae": "البوليغالية",
    "Polygonaceae": "البطباطية",
    "Portulacaceae": "الرجلية",
    "Primulaceae": "الربيعية",
    "Resedaceae": "البليحائية",
    "Rhamnaceae": "النبقية",
    "Rosaceae": "الوردية",
    "Rubiaceae": "الفوية",
    "Rutaceae": "السذابية",
    "Salvadoraceae": "الأراكية",
    "Sapindaceae": "الصابونية",
    "Sapotaceae": "السابوتية",
    "Solanaceae": "الباذنجانية",
    "Tiliaceae": "الزيزفونية",
    "Umbelliferae": "الخيمية",
    "Verbenaceae": "اللويزية",
    "Vitaceae": "العنبية",
    "Zingiberaceae": "الزنجبيلية",
    "Zygophyllaceae": "الرطريطية",
}


# ---------------------------------------------------------------------------
# Plant parts
# ---------------------------------------------------------------------------
# `part_used` is a merged, free-form list ("Leaves, Roots, Seeds; leaf"), so it
# is translated token by token rather than string by string. That also keeps
# rows added later through the admin panel translatable.

PART_TOKENS_AR: dict[str, str] = {
    "aerial part": "الأجزاء الهوائية",
    "aerial parts": "الأجزاء الهوائية",
    "bark": "اللحاء",
    "buds": "البراعم",
    "flower": "الأزهار",
    "flowers": "الأزهار",
    "fruit": "الثمار",
    "fruits": "الثمار",
    "gel": "الهلام",
    "herb": "العشبة",
    "inner bark": "اللحاء الداخلي",
    "latex": "العصارة اللبنية",
    "leaf": "الأوراق",
    "leaves": "الأوراق",
    "pods": "القرون",
    "resin": "الراتنج",
    "resins": "الراتنج",
    "root": "الجذور",
    "roots": "الجذور",
    "sap": "العصارة",
    "seed": "البذور",
    "seeds": "البذور",
    "stem": "السيقان",
    "stems": "السيقان",
    "whole plant": "النبات كامل",
    "young buds": "البراعم الغضة",
    "young stems": "السيقان الغضة",
}

_PART_SPLIT = re.compile(r"[;,]|\band\b", flags=re.IGNORECASE)


def translate_part_used(value: str | None) -> str | None:
    """Translate a merged part-used string, dropping duplicates the merge left behind.

    "Leaves, Roots, Seeds; leaf" -> "الأوراق، الجذور، البذور"

    Chunks that are not a known part are kept verbatim so nothing is silently
    lost; a multi-word chunk falls back to per-word translation ("Leaves fruit
    bark") before giving up.
    """
    if not value:
        return None

    out: list[str] = []
    for chunk in _PART_SPLIT.split(value):
        chunk = chunk.strip(" .;،").lower()
        if not chunk:
            continue
        if chunk in PART_TOKENS_AR:
            pieces = [PART_TOKENS_AR[chunk]]
        else:
            words = chunk.split()
            if words and all(w in PART_TOKENS_AR for w in words):
                pieces = [PART_TOKENS_AR[w] for w in words]
            else:
                pieces = [chunk]
        for piece in pieces:
            if piece not in out:
                out.append(piece)

    return "، ".join(out) or None


# ---------------------------------------------------------------------------
# Plants
# ---------------------------------------------------------------------------
# scientific name -> (local name, traditional use)

PLANTS_AR: dict[str, tuple[str, str]] = {
    "Ecbolium viride": (
        "النومة، ثويمة",
        "تُستخدم الأوراق لعلاج الطفح الجلدي والبثور وآلام الأذن",
    ),
    "Mesembryanthemum nodiflorum": (
        "غاسول، سماح",
        "تؤخذ الجذور لعلاج الإمساك",
    ),
    "Trianthema portulacastrum": (
        "قرة الخش",
        "الوذمة والروماتيزم",
    ),
    "Achyranthes aspera": (
        "حرشاء، ناعم منكسة",
        "الأوراق لآلام المعدة والبواسير والحساسية الجلدية. وتُستخدم الجذور المسحوقة لعلاج الالتهابات الناتجة عن لدغات العقارب",
    ),
    "Aerva javanica": (
        "را، عرا",
        "تُستخدم العشبة كاملة لألم الأسنان، والأزهار والأوراق لوقف النزيف، وكمدرّ للبول",
    ),
    "Amaranthus viridis": (
        "سندر، عرف الديك",
        "يُستخدم لفتح الشهية، ومدرّاً للبول، وطارداً للبلغم، ومليّناً",
    ),
    "Anabasis setifera": (
        "قلّو",
        "يعالج أمراض الكبد",
    ),
    "Celosia argentea": (
        "الديك، عرف الديك",
        "مضاد للالتهاب ومطهّر",
    ),
    "Chenopodium murale": (
        "أبو عفين، زربيح، لسان الطير",
        "ألم المعدة",
    ),
    "Cornulaca monacantha": (
        "سلي",
        "تُستخدم الأوراق لعلاج اليرقان",
    ),
    "Digera muricata": (
        "شوكي",
        "مضاد للالتهاب ويحسّن الهضم؛ مضاد للالتهاب",
    ),
    "Haloxylon salicornicum": (
        "غضا، رمث",
        "السكري ومشاكل الأمعاء",
    ),
    "Seidlitzia rosmarinus": (
        "سعد، أسود، خريزي",
        "يُستخدم للدوخة والغثيان والتهابات اللثة",
    ),
    "Suaeda aegyptiaca": (
        "مالحة",
        "التهابات الأسنان واللثة وتحسين ضعف البصر",
    ),
    "Ammi majus": (
        "الخطط، أرنج عون، نينها",
        "تُستخدم الثمار المجففة لعلاج الأمراض الجلدية والتهابات المسالك البولية",
    ),
    "Calotropis procera": (
        "العشر، شخر",
        "تُدخّن الأوراق المجففة لعلاج الربو، ويُستخدم مسحوق الأوراق للإصابة بالديدان، ولحاء الجذور لعلاج الزحار، والعصارة اللبنية للأمراض الجلدية؛ التهاب المفاصل؛ تُدخّن الأوراق المجففة لعلاج الربو",
    ),
    "Caralluma arabica": (
        "خنصور، ديق",
        "تُستخدم السيقان في تحضير شاي لعلاج أمراض الكبد. كما تُستخدم السيقان لعلاج ارتفاع ضغط الدم",
    ),
    "Caralluma flava": (
        "درّ الكبة، قهر اللحوم",
        "تُستخدم الأجزاء الهوائية كمقوٍّ عام ولأمراض المعدة؛ مقوٍّ عام، وأمراض المعدة، وكبح الجوع",
    ),
    "Caralluma penicillata": (
        "ديج",
        "مضاد للالتهاب ولالتهاب المعدة",
    ),
    "Gomphocarpus fruticosus": (
        "عتب",
        "الحساسية الجلدية والتورّمات",
    ),
    "Leptadenia pyrotechnica": (
        "مرخ",
        "يُستخدم مدرّاً للبول",
    ),
    "Nerium oleander": (
        "حبن",
        "تُستخدم الجذور والأوراق في الأمراض الجلدية والحكة والقروح والأورام. وتُستخدم الأوراق لعلاج التهاب الجيوب الأنفية والتهاب الشعب الهوائية؛ تُستخدم الأوراق لعلاج التهاب الجيوب الأنفية والتهاب الشعب الهوائية",
    ),
    "Pentatropis nivalis": (
        "فشغ",
        "لالتهاب العين",
    ),
    "Pergularia tomentosa": (
        "غلقة",
        "يُستخدم لعلاج الحساسية الجلدية والسعال",
    ),
    "Rhazya stricta": (
        "حرمل",
        "يُستخدم مستخلص الأوراق لالتهاب الحلق والحمّى والتهاب الملتحمة والسكري والإمساك. ويُستنشق دخان الأوراق لمشاكل الصدر. وتُستخدم البذور لرائحة الفم الكريهة؛ يُستنشق دخان أوراقه المجففة عبر أنبوب لعلاج أمراض الصدر؛ تُستخدم البذور لرائحة الفم الكريهة",
    ),
    "Sarcostemma viminale": (
        "بيدول",
        "الجروح والحروق والالتهابات الجلدية",
    ),
    "Aristolochia bracteolata": (
        "غاغة، مخيسة",
        "يُستخدم لعلاج لدغات الأفاعي والعقارب وللمشاكل الجلدية",
    ),
    "Artemisia herba-alba": (
        "شحة، شيح رومي",
        "اضطرابات الهضم وآلام البطن",
    ),
    "Carthamus tinctorius": (
        "زعفران، عصفر",
        "يُستخدم لعلاج التهاب الملتحمة واحمرار العين وتورّمها",
    ),
    "Cichorium intybus": (
        "هندباء برية",
        "يُستخدم مغلي الأوراق لعلاج الحمّى. وتُؤكل الثمار لعلاج الصداع واليرقان",
    ),
    "Eclipta prostrata": (
        "البهنقة البيضاء",
        "للسعة العقرب",
    ),
    "Euryops arabicus": (
        "حنقلان، كبوف",
        "الجروح، ومسكّن للألم، ولدغات الأفاعي؛ مسكّن للألم",
    ),
    "Launaea intubace": (
        "حوّة",
        "يوقف النزيف المفرط بعد الولادة، ويعالج قرحة المعدة",
    ),
    "Pluchea arabica": (
        "إقط، أبو عين صفراء، أنسفوت",
        "يُستخدم النبات كاملاً لعلاج الدمامل والقروح الجلدية، ويُستخدم عصير الأوراق كقطرة للأذن ولمغص البطن",
    ),
    "Pulicaria glutinosa": (
        "المهتدي",
        "ألم المعدة والمغص",
    ),
    "Reichardia tingitana": (
        "نقد، حوى، مرار",
        "تُستخدم الأوراق لعلاج ألم المعدة والإمساك والتهاب العين",
    ),
    "Sonchus oleraceus": (
        "العضيض، دلاوين",
        "مدرّ للبول، ومليّن، ومقوٍّ عام",
    ),
    "Tagetes erecta": (
        "المخملية",
        "الأوراق مطهّرة، وللألم العضلي والدمامل، والأزهار للحمّى",
    ),
    "Vernonia cinerea": (
        "كِبّ",
        "تُستخدم الأوراق لعلاج لدغات العقارب، وتُستخدم أيضاً في الحمّى. وتُستخدم الجذور والبذور كمدرّ للبول",
    ),
    "Aloe dhofarensis": (
        "صبر",
        "تُستخدم الأوراق للصداع وآلام الأطراف والمفاصل والطفح الجلدي والسكري والحمّى والتئام الجروح",
    ),
    "Asphodelus tenuifolius": (
        "كوثر",
        "النبات كاملاً والبذور: مليّن، ومدرّ للبول، ولعلاج ألم الأسنان ونزلات البرد؛ لعلاج البرد",
    ),
    "Arnebia hispidissima": (
        "حمات، حبرك، كحل",
        "لتخفيف الحمّى وأمراض الجلد والشعر",
    ),
    "Cordia myxa": (
        "بميرة، كاو، دباق، مخيط",
        "تُؤكل البذور لعلاج الإسهال، ويُستخدم شاي الأوراق لعلاج آلام البطن",
    ),
    "Heliotropium bacciferum": (
        "حفا",
        "تُستخدم لبخة الأوراق ضد لدغات العقارب",
    ),
    "Heliotropium kotschyi": (
        "رمرام، فحّاء",
        "تُستخدم الأوراق لعلاج الدمامل والالتهابات. وتُستخدم أيضاً لعلاج القرح والبثور",
    ),
    "Heliotropium longiflorum": (
        "حبلم، شبرم",
        "لالتهابات العين والجلد",
    ),
    "Anastatica hierochuntica": (
        "كف مريم",
        "له نشاط مضاد للسكري، ويُستخدم النبات المجفف أثناء الولادة، ولخفض الحمّى والمغص عند الأطفال",
    ),
    "Lepidium sativum": (
        "الرشاد",
        "لالتئام الكسور والسعال وضيق الصدر والربو؛ تُستخدم البذور لرائحة الفم الكريهة",
    ),
    "Physorrhynchus chamaerapistrum": (
        "خفيج",
        "تُستخدم الأوراق والسيقان لعلاج ألم الأذن، وتُستخدم البذور للتخلص من الشامات والثآليل",
    ),
    "Sisymbrium irio": (
        "حورة",
        "يُستخدم محلول ناتج عن غلي البذور في الماء لتخفيف نزلات البرد والحمّى؛ لعلاج البرد والحمّى",
    ),
    "Boswellia sacra": (
        "لبان",
        "الربو والجروح والقرحة والتهاب الشعب الهوائية ومشاكل المعدة واللثة وأمراض الصدر وحصى الكلى؛ لعلاج الربو والتهاب الشعب الهوائية",
    ),
    "Commiphora gileadensis": (
        "سوكف",
        "الألم والحمّى والتورّم وقرحة المعدة",
    ),
    "Commiphora myrrha": (
        "المرّ",
        "له نشاط مضاد لالتهاب المفاصل ومضاد للالتهاب؛ مضاد للالتهاب",
    ),
    "Commiphora wightii": (
        "مقل",
        "الالتهاب والتهاب المفاصل والجروح والكسور؛ لعلاج الالتهاب",
    ),
    "Cadaba farinosa": (
        "أذان الأرنب",
        "تُستخدم الأوراق للمغص ومشاكل العين والسعال",
    ),
    "Cadaba heterotricha": (
        "القضب",
        "تُستخدم الأوراق واللحاء الداخلي لعلاج لدغات الأفاعي وتخفيف الالتهاب والحكة",
    ),
    "Capparis cartilaginea": (
        "قنفر",
        "تُستخدم الأوراق والسيقان لألم الأذن ومشاكل الكلى والصداع والكدمات والشلل والتورّمات ولدغات الأفاعي",
    ),
    "Capparis decidua": (
        "كليل، كبرة",
        "يُستخدم مستخلص اللحاء في الربو والسعال. وتُستخدم الأوراق للالتهابات؛ تُستخدم الأوراق للالتهاب",
    ),
    "Capparis spinosa": (
        "لصف",
        "تُخلط الأوراق المسحوقة بالزيت وتُستخدم كقطرة للأذن. وتُستخدم الأوراق للسكري. ويُستخدم مستخلص الجذر لعلاج الروماتيزم والشلل والسعال. وتُؤخذ البذور لعلاج الخصوبة عند النساء وآلام الدورة الشهرية، وتُوضع البذور المسحوقة على القروح؛ يُستخدم الجذر لعلاج السعال",
    ),
    "Stellaria media": (
        "مشيط، الغرشية",
        "الألم الروماتيزمي والقروح والجروح",
    ),
    "Dipterygium glaucum": (
        "القا",
        "يُستخدم النبات في الربو وكطارد للبلغم",
    ),
    "Maerua crassifolia": (
        "سرح",
        "تُستخدم الأوراق لعلاج ألم الأسنان والمغص البطني والإمساك وأمراض الأمعاء",
    ),
    "Polycarpaea repens": (
        "المكارة، مخور",
        "يُوضع النبات المسحوق كترياق ضد لدغات الأفاعي",
    ),
    "Cleome brachycarpa": (
        "خزيمة، خزيمز",
        "الالتهاب والأمراض الجلدية والصداع؛ للالتهاب",
    ),
    "Cleome gynandra": (
        "أبو كريم",
        "الألم وضعف العضلات",
    ),
    "Cleome rupicola": (
        "شجرة الوحش",
        "المياه البيضاء (الساد)",
    ),
    "Convolvulus arvensis": (
        "مديد",
        "يُستخدم لوقف النزيف وكمهدّئ",
    ),
    "Cressa cretica": (
        "ندوة، شويل",
        "تُستخدم جميع أجزاء النبات كطارد للبلغم",
    ),
    "Ipomoea pes-caprae": (
        "درغ",
        "تُستخدم البذور كمليّن",
    ),
    "Citrullus colocynthis": (
        "حنظل",
        "تُستخدم الثمار والأوراق للسكري وانخفاض سكر الدم؛ لدغات الكلاب والحشرات",
    ),
    "Cucumis prophetarum": (
        "لمة الحوش",
        "أمراض الكبد والإمساك، ومسهّل، وألم المعدة",
    ),
    "Juniperus excelsa": (
        "العلعلان",
        "هاضم ومدرّ للبول",
    ),
    "Cyperus rotundus": (
        "سعد أسير",
        "تُستخدم البذور كمدرّ للبول وتُستخدم أيضاً لعلاج ألم الأسنان ومشاكل اللثة",
    ),
    "Ephedra foliata": (
        "كتل",
        "المياه البيضاء والتهاب الملتحمة",
    ),
    "Acalypha indica": (
        "عيان القردة",
        "طارد للبلغم، ومليّن، ويُستخدم لعلاج التهاب الشعب الهوائية والربو؛ يُستخدم للربو",
    ),
    "Chrozophora oblongifolia": (
        "مشرية",
        "تُستخدم الثمار لعلاج الجروح",
    ),
    "Euphorbia granulata": (
        "حلب",
        "التئام الجروح",
    ),
    "Euphorbia hirta": (
        "عشبة الربو",
        "يُستخدم في الربو والتهاب الشعب الهوائية",
    ),
    "Euphorbia larica": (
        "إسبق، لبنة",
        "تُستخدم العصارة اللبنية لعلاج المشاكل الجلدية وألم الأذن؛ اللدغات والدمامل والحروق",
    ),
    "Euphorbia schimperi": (
        "إمتز",
        "التئام الجروح المتقيّحة",
    ),
    "Ricinus communis": (
        "عرش، خروع",
        "تُستخدم الأوراق والجذور ضد البثور والقروح وألم الأسنان والتهاب العين والشلل",
    ),
    "Acacia ehrenbergiana": (
        "سلم",
        "يُستخدم دخان الخشب لعلاج الشلل بتمرير الدخان على الأطراف المصابة",
    ),
    "Acacia gerrardii": (
        "طلح",
        "يُوضع الراتنج على الجلد المحروق، ويُمضغ أيضاً لألم الأسنان، وتُستخدم الثمار ضد الحمّى، والأوراق للمغص",
    ),
    "Acacia nilotica": (
        "قرط",
        "الأوراق للمياه البيضاء والسعال والسكري والحروق، والجذور لتنظيف الأسنان، والبذور لقرحة المعدة؛ تُستخدم الأوراق لعلاج السعال",
    ),
    "Alhagi graecorum": (
        "علوق، شويكة",
        "اليرقان والمياه البيضاء والصداع النصفي وآلام المفاصل، ومسكّن للألم، ومدرّ للبول، ومليّن",
    ),
    "Astragalus fasciculifolius": (
        "إنتريس",
        "المياه البيضاء",
    ),
    "Crotalaria aegyptiaca": (
        "نزا، قضب",
        "الربو",
    ),
    "Indigofera oblongifolia": (
        "أحاسيط، عسورة",
        "تُستخدم الجذور كمسكّن للألم ومضاد للالتهاب؛ يُستخدم الجذر للالتهاب",
    ),
    "Melilotus albus": (
        "نفل، الحندقوق الأبيض",
        "يُستخدم لعلاج الألم الروماتيزمي",
    ),
    "Melilotus indicus": (
        "قرض، نفلة، الحندقوق الهندي",
        "يُستخدم لعلاج التورّم واضطرابات الأمعاء وتهدئة الطفح الجلدي",
    ),
    "Prosopis cineraria": (
        "غاف",
        "يُستخدم مستخلص القرون المسحوقة كقطرة للأذن، وتُمضغ الأوراق لألم الأسنان. ويُخلط رماد اللحاء المحروق بالماء ويُوضع على موضع الكسر لتخفيف الألم؛ قابض وملطّف",
    ),
    "Senna holosericea": (
        "خرخاش",
        "تُستخدم الأوراق والبذور كمليّن ولعلاج الأمراض العصبية",
    ),
    "Senna italica": (
        "إشرِك",
        "تُستخدم البذور والأوراق لعلاج تقلصات المعدة والإمساك",
    ),
    "Tephrosia apollinea": (
        "الضفرة",
        "الجذور والأوراق لألم الأذن والسعال والتهاب الشعب الهوائية والجروح وخفض ضغط الدم؛ الجذور والأوراق لألم الأذن والسعال والتهاب الشعب الهوائية",
    ),
    "Tephrosia nubica": (
        "عقمان، عيتمان",
        "علاج الصرع",
    ),
    "Tephrosia purpurea": (
        "حويرة أرجوانية",
        "يُستخدم لالتهاب الشعب الهوائية والربو والأورام والقروح؛ يُستخدم لالتهاب الشعب الهوائية والربو",
    ),
    "Juglans regia": (
        "نقش، جوز",
        "تُستخدم الأوراق لعلاج الإكزيما، وتُستخدم الثمرة للمشاكل العصبية",
    ),
    "Lavandula dhofarensis": (
        "حرم، أحبون",
        "تُستخدم الأوراق لعلاج ألم المعدة ومشاكل الكلى وللجهاز العصبي",
    ),
    "Ocimum forssakaolii": (
        "ريحان",
        "الأوراق لنزلات البرد والإسهال، وتُغلى البذور في الماء وتُشرب لعلاج الإسهال",
    ),
    "Salvia aegyptiaca": (
        "رعل، براهو، مرو",
        "تُستخدم البذور للبواسير والإسهال",
    ),
    "Teucrium stocksianum": (
        "جعدة",
        "المغص وألم المعدة والحمّى، ومضاد للالتهاب. وللحمّى تُغلى الأوراق في ماء الورد لمدة طويلة",
    ),
    "Teucrium polium": (
        "مسك الجن",
        "يُستخدم مغلي الأوراق لقرح الجلد. ويُستخدم النبات كاملاً لأمراض الكبد والسكري",
    ),
    "Zataria multiflora": (
        "زعتر",
        "السعال وألم المعدة؛ السعال",
    ),
    "Lawsonia inermis": (
        "حنّاء",
        "مقوٍّ للشعر، والحمّى، ومضاد للالتهاب، وقرح الفم",
    ),
    "Acridocarpus orientalis": (
        "قفص",
        "الصداع والألم العضلي وتدليك الأطراف المشلولة؛ الصداع والألم العضلي",
    ),
    "Abutilon pannosum": (
        "قرقة",
        "تُستخدم البذرة لعلاج السعال. ويُستخدم اللحاء والجذر كمدرّ للبول وفي الحمّى. وتُستخدم الأوراق للإسهال",
    ),
    "Malva parviflora": (
        "شويب الحمام",
        "يُستخدم منقوع البذور والأوراق لتهدئة الجلد وعلاج الحمّى والصداع، ويُستخدم أيضاً كغرغرة لقرح الفم",
    ),
    "Cocculus pendulus": (
        "نشتين، رسراس",
        "الإمساك والمشاكل الجلدية والتهاب العين",
    ),
    "Glinus lotoides": (
        "حمباز",
        "يُستخدم للإسهال وآلام الأطراف",
    ),
    "Dorstenia foetida": (
        "كرتيب",
        "تُستخدم البذور لاضطرابات المعدة",
    ),
    "Ficus carica": (
        "تين",
        "تُوضع العصارة اللبنية على موضع اللدغات السامة. وتُستخدم الثمار والأوراق والعصارة للسعال؛ لعلاج الجلد وتخفيف السعال",
    ),
    "Morus nigra": (
        "التوت الأسود",
        "السعال والحمّى وألم الأسنان والتهاب العين والصداع؛ السعال والحمّى",
    ),
    "Moringa peregrina": (
        "شوع، شو",
        "زيت البذور لآلام المفاصل وألم الظهر وتجبير العظام وتقلصات المعدة والتورّم؛ يُستخدم زيت البذور لتجبير العظام",
    ),
    "Myrtus communis": (
        "ياس",
        "الحروق والقروح والتقرحات والمغص البطني ولسعات العقارب وداء الليشمانيات؛ يُستخدم للسعة العقرب والحروق والقروح والتقرحات. مطهّر ومضاد للروماتيزم",
    ),
    "Jasminum grandiflorum": (
        "ياسمين",
        "تُستخدم الأوراق والأزهار المجففة للزحار وآلام البطن، وتُستخدم الأوراق كمسهّل",
    ),
    "Olea europaea": (
        "عتم",
        "الأوراق لارتفاع ضغط الدم، ويُستخدم الراتنج والثمار والأوراق واللحاء لعلاج المياه البيضاء. والروماتيزم والتهاب اللثة",
    ),
    "Cistanche tubulosa": (
        "ذنون أنبوبي",
        "اليرقان والإسهال",
    ),
    "Oxalis corniculata": (
        "الحماض",
        "نزلات البرد والسعال",
    ),
    "Argemone mexicana": (
        "غدرقة",
        "عصير الأوراق للسعة العقرب: ويُوضع معجون الجذر على موضع الألم",
    ),
    "Fumaria parviflora": (
        "شعير شطرج",
        "يُستخدم كطارد للديدان ومليّن. ويُستخدم أيضاً للأمراض الجلدية",
    ),
    "Andrachne aspera": (
        "شجرة العقرب",
        "يُستخدم لعلاج التهاب العين",
    ),
    "Plantago coronopus": (
        "لسان الحمل",
        "يُستخدم النبات كاملاً كمسهّل ولعلاج الجروح",
    ),
    "Plantago major": (
        "ورق",
        "تُستخدم البذور في الإسهال والزحار وعلاج الحمّى",
    ),
    "Plantago ovata": (
        "قربتوه، لقيمة الفقع",
        "تُخلط البذور بالماء وتُستخدم لعلاج الأمراض التناسلية",
    ),
    "Dyerophytum indicum": (
        "مليحلة",
        "تُجفف السيقان وتُدخّن لعلاج صعوبة التنفس والسعال",
    ),
    "Limonium axillare": (
        "القطف، خزامى البحر",
        "يُستخدم النبات كاملاً للإسهال وكقابض",
    ),
    "Plumbago zeylanica": (
        "إنكعن، إنسعين",
        "تُستخدم الجذور والسيقان لعلاج المشاكل الجلدية",
    ),
    "Calligonum comosum": (
        "أرطى، أرطان، أبل",
        "مضاد للالتهاب ومضاد للقرحة، ولألم الأسنان",
    ),
    "Pteropyrum scoparium": (
        "سيداف",
        "تُؤكل الأوراق لعلاج عسر الهضم وكمقوٍّ منقٍّ للدم",
    ),
    "Rumex vesicarius": (
        "الحماض، ضرس العجوز، سريل",
        "تُستخدم الأوراق والبذور ضد لسعات العقارب",
    ),
    "Portulaca grandiflora": (
        "البقلة المزهرة",
        "يُستخدم لعلاج لدغات الأفاعي والحشرات والحروق",
    ),
    "Portulaca oleracea": (
        "غلينبة، رجلة، بربير",
        "يُستخدم النبات كاملاً للإمساك والأمراض الجلدية وأمراض المثانة والكلى",
    ),
    "Anagallis arvensis": (
        "عوينات، عيان، القطوات",
        "يُستخدم ضد الطفح الجلدي والبثور وقرح الجلد",
    ),
    "Ochradenus arabicus": (
        "قرلية، أسمط، حباب",
        "تُؤكل الثمار غير الناضجة لعلاج مشاكل الهضم",
    ),
    "Ziziphus jujuba": (
        "العناب",
        "الثمار فعّالة كمليّن وتُستخدم في الإمساك وللسكري",
    ),
    "Ziziphus spina-christi": (
        "سدر",
        "تُستخدم الأوراق لقروح الجلد والتهاب المفاصل، وتُؤكل الثمار والبذور لعلاج آلام الصدر؛ لعلاج ألم الصدر",
    ),
    "Plocama aucheri": (
        "خرمان",
        "للمغص والدوخة",
    ),
    "Citrus aurantifolia": (
        "الليمون البلدي",
        "يُستخدم العصير والثمرة والقشر واللحاء للمياه البيضاء ونزلات البرد والحمّى وألم الصدر وألم الأذن وألم المعدة",
    ),
    "Haplophyllum tuberculatum": (
        "ظفر تيس",
        "تُستخدم الأوراق لتقوية عضلات الظهر بعد الولادة، ولألم الصدر ومشاكل المعدة، وكمهدّئ",
    ),
    "Ruta chalepensis": (
        "سذاب",
        "كضماد للدغات الأفاعي، وللحمّى والمغص",
    ),
    "Salvadora persica": (
        "راك",
        "يُستخدم كفرشاة أسنان، وتُستخدم الأوراق والثمار المجففة والسيقان لعلاج التورّم والقروح والبثور والسعال؛ لعلاج التورّم والسعال",
    ),
    "Dodonaea angustifolia": (
        "شرج",
        "الحمّى والتهاب الحلق",
    ),
    "Dodonaea viscosa": (
        "شهص",
        "تُستخدم الأوراق لعلاج ألم الأسنان والحروق والعظام",
    ),
    "Sideroxylon mascatense": (
        "بوت",
        "تُستخدم الثمار كمليّن ومقوٍّ",
    ),
    "Datura innoxia": (
        "الشوكية، الداتورة",
        "المغص والربو والصداع، ومخدّر؛ الربو",
    ),
    "Datura metel": (
        "مرانها، تاتورة",
        "تُدخّن الأزهار والأوراق لعلاج الربو وكمهدّئ ولعلاج الطفح الجلدي؛ مهدّئ، يُستخدم لعلاج الربو؛ تُدخّن الأزهار والأوراق لعلاج الربو",
    ),
    "Lycium shawii": (
        "قصد، غرقد",
        "يُستخدم كمسهّل ومدرّ للبول ومقوٍّ؛ إزالة السموم، ومضاد للالتهاب، ولالتهاب العين",
    ),
    "Physalis minima": (
        "حرنكش",
        "مقوٍّ ومسهّل",
    ),
    "Solanum incanum": (
        "شرنجبان، حلقم، مازي",
        "تُستخدم الأوراق والثمار لعسر الهضم وخلع العظام وألم الأسنان؛ البواسير وألم الأذن؛ البواسير والتهابات العين والأذن",
    ),
    "Solanum nigrum": (
        "مجاج، شجرة الغروب",
        "الأوراق والجذور لعلاج الحروق وتقليل التورّم، والجذور كمهدّئ",
    ),
    "Withania somnifera": (
        "بابو",
        "الأوراق والجذور لعلاج اللسعات واللدغات",
    ),
    "Grewia erythraea": (
        "شرهم",
        "الجَرَب",
    ),
    "Lantana camara": (
        "مقوسة، لانتانا، ملتوية أم كلثوم",
        "الأوراق للحكة الجلدية والجروح. ويُستخدم الجذر للسعال والحمّى والصداع؛ يُستخدم الجذر للسعال",
    ),
    "Phyla nodiflora": (
        "زنزلة",
        "للقروح والجروح والحمّى والربو؛ للحمّى والربو",
    ),
    "Verbena officinalis": (
        "رعي الحمام",
        "يُستخدم في الحمّى وفقر الدم",
    ),
    "Cissus quadrangularis": (
        "سلع، عطرا",
        "يُستخدم الساق للبواسير والإمساك",
    ),
    "Fagonia indica": (
        "شكاع",
        "الأوراق والجذر لعلاج الحروق والحمّى والإمساك",
    ),
    "Fagonia schweinfurthii": (
        "القوب، درنوه",
        "مضاد للالتهاب ولالتئام الجروح، والحساسية الجلدية",
    ),
    "Tribulus terrestris": (
        "ضريس",
        "تُستخدم الثمار كمقوٍّ ومدرّ للبول ولعلاج اضطرابات المسالك البولية والعجز الجنسي",
    ),
    "Tetraena simplex": (
        "ثرمد، الدمران",
        "يُستخدم مستخلص الأوراق ضد تورّم العين",
    ),
    "Rosa damascena": (
        "ورد",
        "قابض، ومقوٍّ للقلب والرأس. ويُستخدم كقطرة للعين",
    ),
    "Allium sativum": (
        "ثوم، كراث",
        "الحمّى والالتهابات الرئوية والروماتيزم، وخافض لسكر الدم، ومسهّل",
    ),
    "Thymus vulgaris": (
        "زعتر",
        "طارد للغازات ومضاد للتشنج",
    ),
    "Cinnamomum zeylanicum": (
        "قرفة",
        "التهابات الجهاز التنفسي والروماتيزم والتهاب المفاصل والآلام العامة",
    ),
    "Eugenia caryophyllus": (
        "قرنفل",
        "حبّ الشباب والكدمات والحروق والجروح، ولألم الأسنان وقرح الفم",
    ),
    "Cannabis sativa": (
        "الكيف",
        "حابس، ومخدّر، وقابض، ومهدّئ",
    ),
    "Cassia acutifolia": (
        "سنا مكي",
        "مليّن",
    ),
    "Juniper excelsa": (
        "عرعر",
        "عطري، ومنبّه، وهاضم، ومدرّ للبول",
    ),
    "Boswellia carteri or B.sacra": (
        "مهور، شيحذ مغر",
        "الربو والجروح والقروح والتهاب الشعب الهوائية، ومدرّ للبول، ومقوٍّ لتنظيف الجهاز الهضمي وتعطير الفم",
    ),
    "Teucrium mascatense": (
        "كلبوره، قصبة",
        "مضاد للبكتيريا، ومسكّن للألم، ومضاد للالتهاب، ومقوٍّ مرّ خافض للحرارة",
    ),
    "Ocimum basilicum": (
        "ثيمران زواب",
        "نزلات البرد ومشاكل العين ولدغات الحشرات",
    ),
    "Cuminum cyminum": (
        "كمون أو سنوت",
        "لفتح الشهية، وتُغلى البذور المطحونة مع الليمون وتُشرب لعلاج المغص",
    ),
    "Carica papaya": (
        "بابايا أو فيفاي",
        "الإسهال",
    ),
    "Juglans cinerea": (
        "جوز أو نقش",
        "الإكزيما",
    ),
    "Aloe barbedensis A.dhofarensis, A.innermis": (
        "إسقل، صبّار",
        "مسهّل، والتهابات العين، والتئام الجروح",
    ),
    "Zingiber officinale": (
        "زنجبيل",
        "أمراض المعدة",
    ),
    "Ficus cordata": (
        "ثعب",
        "اللدغات والدمامل والحروق",
    ),
    "Acacia gerardii": (
        "ثبيان",
        "اللدغات والدمامل والحروق",
    ),
    "Phoenix dactylifera": (
        "نخلة",
        "مقوٍّ عام، ومبرّد، ومنشّط جنسي، والتهاب الشعب الهوائية",
    ),
    "Cadaba Farinosa": (
        "أذان الأرنب",
        "للسعال",
    ),
}


# ---------------------------------------------------------------------------
# Apply to the database
# ---------------------------------------------------------------------------

PLANT_AR_COLUMNS = {
    "family_ar": "TEXT",
    "local_name_ar": "TEXT",
    "part_used_ar": "TEXT",
    "traditional_use_ar": "TEXT",
}
CONDITION_AR_COLUMNS = {"name_ar": "TEXT"}


def _add_missing_columns(con: sqlite3.Connection, table: str, columns: dict[str, str]) -> None:
    existing = {r[1] for r in con.execute(f"PRAGMA table_info({table})")}
    for name, coltype in columns.items():
        if name not in existing:
            con.execute(f"ALTER TABLE {table} ADD COLUMN {name} {coltype}")


def apply_arabic_translations(con: sqlite3.Connection) -> dict[str, int]:
    """Add the ``*_ar`` columns if needed and (re)fill them from this module.

    Safe to run on every startup: it only overwrites the ``*_ar`` columns, and
    only for rows this module has a translation for. Arabic text typed into the
    admin panel for a row we don't know about is left alone.
    """
    _add_missing_columns(con, "plants", PLANT_AR_COLUMNS)
    _add_missing_columns(con, "conditions", CONDITION_AR_COLUMNS)

    counts = {"plants": 0, "conditions": 0}

    for row in con.execute(
        "SELECT id, scientific_name, family, part_used FROM plants"
    ).fetchall():
        plant_id, sci, family, part_used = row
        local_ar, use_ar = PLANTS_AR.get(sci, (None, None))
        family_ar = FAMILIES_AR.get(family) if family else None
        part_ar = translate_part_used(part_used)
        if not any((local_ar, use_ar, family_ar, part_ar)):
            continue
        con.execute(
            "UPDATE plants SET family_ar=?, local_name_ar=?, part_used_ar=?, "
            "traditional_use_ar=? WHERE id=?",
            (family_ar, local_ar, part_ar, use_ar, plant_id),
        )
        counts["plants"] += 1

    for cond_id, name in con.execute("SELECT id, name FROM conditions").fetchall():
        name_ar = CONDITIONS_AR.get(name)
        if not name_ar:
            continue
        con.execute("UPDATE conditions SET name_ar=? WHERE id=?", (name_ar, cond_id))
        counts["conditions"] += 1

    con.commit()
    return counts


def report_missing(con: sqlite3.Connection) -> dict[str, list[str]]:
    """List dataset values that have no Arabic counterpart yet."""
    missing: dict[str, list[str]] = {}
    missing["plants"] = [
        r[0] for r in con.execute("SELECT scientific_name FROM plants")
        if r[0] not in PLANTS_AR
    ]
    missing["families"] = [
        r[0] for r in con.execute("SELECT DISTINCT family FROM plants WHERE family IS NOT NULL")
        if r[0] not in FAMILIES_AR
    ]
    missing["conditions"] = [
        r[0] for r in con.execute("SELECT name FROM conditions")
        if r[0] not in CONDITIONS_AR
    ]
    return {k: v for k, v in missing.items() if v}


if __name__ == "__main__":
    from pathlib import Path

    connection = sqlite3.connect(Path(__file__).parent / "omani_ethno.db")
    print(apply_arabic_translations(connection))
    gaps = report_missing(connection)
    print("Missing Arabic:", gaps if gaps else "none")
    connection.close()
