/* eslint-disable complexity */
import { useEffect, useMemo, useRef, useState } from "react";

import { campAPI } from "../api/index.js";

const EMPTY_COURSE = {
  title: "",
  coverUrl: "",
  summary: "",
  description: "",
  priceCents: 0,
  startsAt: "",
  status: "draft",
  tagsText: "",
  liveUrl: "",
};

const EMPTY_OPERATIONS = {
  stats: {
    enrollmentCount: 0,
    redemptionEnrollments: 0,
    averageProgress: 0,
    revenueDisplay: "¥0",
  },
  enrollments: [],
  redemptions: [],
};

const EMPTY_REDEMPTION_FORM = {
  code: "",
  maxUses: 1,
  expiresAt: "",
};

const COVER_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_COVER_BYTES = 5 * 1024 * 1024;

function toDateTimeInput(timestamp) {
  if (!timestamp) return "";
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeInput(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function isValidUrl(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function firstUrlError({ form, detail }) {
  if (!isValidUrl(form.coverUrl)) return "课程封面图链接格式不正确";
  if (!isValidUrl(form.liveUrl)) return "默认直播链接格式不正确";
  const lesson = detail.lessons.find((item) => !isValidUrl(item.liveUrl) || !isValidUrl(item.replayUrl));
  if (lesson) return "课程目录中的直播或回放链接格式不正确";
  const material = detail.materials.find((item) => !isValidUrl(item.url));
  if (material) return "资料链接格式不正确";
  return "";
}

function toCourseForm(course = null) {
  if (!course) return EMPTY_COURSE;
  return {
    title: course.title || "",
    coverUrl: course.coverUrl || "",
    summary: course.summary || "",
    description: course.description || "",
    priceCents: course.price?.amountCents || 0,
    startsAt: toDateTimeInput(course.startsAt),
    status: course.status || "draft",
    tagsText: (course.tags || []).join("，"),
    liveUrl: course.liveUrl || "",
  };
}

function coursePayload(form) {
  return {
    title: form.title,
    coverUrl: form.coverUrl,
    summary: form.summary,
    description: form.description,
    priceCents: Number(form.priceCents || 0),
    startsAt: fromDateTimeInput(form.startsAt),
    status: form.status,
    tags: String(form.tagsText || "").split(/[，,]/).map((item) => item.trim()).filter(Boolean),
    liveUrl: form.liveUrl,
  };
}

function materialFromSpecial(materials, type) {
  const item = materials.find((entry) => entry.type === type);
  return {
    id: item?.id || "",
    description: item?.title || "",
    targetPage: item?.url || "",
  };
}

function normalizeDetail(data) {
  const materials = data?.materials || [];
  return {
    course: data?.course || null,
    lessons: (data?.lessons || []).map((lesson, index) => ({
      id: lesson.id,
      title: lesson.title || `Day ${index + 1}`,
      startsAt: toDateTimeInput(lesson.startsAt),
      liveUrl: lesson.liveUrl || "",
      replayUrl: lesson.replayUrl || "",
      sortOrder: lesson.sortOrder || index + 1,
    })),
    materials: materials
      .filter((item) => !["homework", "ai_practice"].includes(item.type))
      .map((item, index) => ({
        id: item.id,
        title: item.title || "",
        type: item.type || "pdf",
        url: item.url || "",
        lessonId: item.lessonId || "",
        sortOrder: item.sortOrder || index + 1,
      })),
    homework: materialFromSpecial(materials, "homework"),
    aiPractice: materialFromSpecial(materials, "ai_practice"),
  };
}

function normalizeOperations(data) {
  return {
    ...EMPTY_OPERATIONS,
    ...(data || {}),
    stats: {
      ...EMPTY_OPERATIONS.stats,
      ...(data?.stats || {}),
    },
    enrollments: data?.enrollments || [],
    redemptions: data?.redemptions || [],
  };
}

function createLesson(index) {
  return {
    id: `lesson-${Date.now()}-${index}`,
    title: `Day ${index + 1}`,
    startsAt: "",
    liveUrl: "",
    replayUrl: "",
    sortOrder: index + 1,
  };
}

function createMaterial(index) {
  return {
    id: `material-${Date.now()}-${index}`,
    title: "",
    type: "pdf",
    url: "",
    lessonId: "",
    sortOrder: index + 1,
  };
}

function formatPreviewTime(value) {
  if (!value) return "未设置时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未设置时间";
  return date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value) {
  if (!value) return "未设置";
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "未设置";
  return date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#6c5d4d", fontWeight: 700 }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle = {
  border: "1px solid #e5d9ca",
  borderRadius: 8,
  padding: "10px 11px",
  font: "inherit",
  minWidth: 0,
};

const buttonStyle = {
  border: "1px solid #241b15",
  borderRadius: 8,
  background: "#241b15",
  color: "#fff8ee",
  font: "inherit",
  fontWeight: 800,
  padding: "10px 13px",
  cursor: "pointer",
};

export default function CampManagementPage({ isMobile = false }) {
  const coverInputRef = useRef(null);
  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(normalizeDetail(null));
  const [form, setForm] = useState(EMPTY_COURSE);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [operations, setOperations] = useState(EMPTY_OPERATIONS);
  const [redemptionForm, setRedemptionForm] = useState(EMPTY_REDEMPTION_FORM);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedId) || null,
    [courses, selectedId]
  );

  async function loadCourses(nextSelectedId = selectedId) {
    const list = await campAPI.adminListCourses();
    setCourses(list || []);
    const nextId = nextSelectedId || list?.[0]?.id || "";
    setSelectedId(nextId);
    return nextId;
  }

  async function loadDetail(courseId) {
    if (!courseId) {
      setDetail(normalizeDetail(null));
      setForm(EMPTY_COURSE);
      return;
    }
    const data = await campAPI.adminGetCourse(courseId);
    const nextDetail = normalizeDetail(data);
    setDetail(nextDetail);
    setForm(toCourseForm(nextDetail.course));
  }

  async function loadOperations(courseId) {
    if (!courseId) {
      setOperations(EMPTY_OPERATIONS);
      return;
    }
    const data = await campAPI.adminGetOperations(courseId);
    setOperations(normalizeOperations(data));
  }

  useEffect(() => {
    let active = true;
    async function loadInitialData() {
      try {
        const list = await campAPI.adminListCourses();
        if (!active) return;
        setCourses(list || []);
        const firstId = list?.[0]?.id || "";
        setSelectedId(firstId);
        if (!firstId) return;
        const [data, operationsData] = await Promise.all([
          campAPI.adminGetCourse(firstId),
          campAPI.adminGetOperations(firstId),
        ]);
        if (!active) return;
        const nextDetail = normalizeDetail(data);
        setDetail(nextDetail);
        setForm(toCourseForm(nextDetail.course));
        setOperations(normalizeOperations(operationsData));
      } catch (error) {
        if (active) setMessage(error.message || "课程加载失败");
      }
    }
    loadInitialData();
    return () => { active = false; };
  }, []);

  async function selectCourse(courseId) {
    setSelectedId(courseId);
    setMessage("");
    try {
      await loadDetail(courseId);
      await loadOperations(courseId);
    } catch (error) {
      setMessage(error.message || "课程加载失败");
    }
  }

  function startNewCourse() {
    setSelectedId("");
    setDetail(normalizeDetail(null));
    setForm(EMPTY_COURSE);
    setOperations(EMPTY_OPERATIONS);
    setRedemptionForm(EMPTY_REDEMPTION_FORM);
    setMessage("");
    setPreviewing(false);
  }

  async function saveCourse(nextStatus = form.status) {
    const urlError = firstUrlError({ form, detail });
    if (urlError) {
      setMessage(urlError);
      return;
    }
    if (nextStatus === "published" && !form.title.trim()) {
      setMessage("课程名不能为空");
      return;
    }
    if (nextStatus === "published" && !detail.lessons.length) {
      setMessage("发布前至少需要 1 节课");
      return;
    }
    if (nextStatus === "published" && !form.startsAt) {
      setMessage("已发布课程至少需要开课时间");
      return;
    }
    if (nextStatus === "published" && !selectedId) {
      setMessage("请先保存基础信息和课程内容，再发布课程");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const payload = coursePayload({ ...form, status: nextStatus === "published" ? form.status : nextStatus });
      let data = selectedId
        ? await campAPI.adminUpdateCourse(selectedId, payload)
        : await campAPI.adminCreateCourse(payload);
      const nextId = data?.course?.id;
      await loadCourses(nextId);
      await loadDetail(nextId);
      await loadOperations(nextId);
      if (nextStatus === "published") {
        data = await campAPI.adminPublishCourse(nextId);
        await loadCourses(nextId);
        await loadDetail(nextId);
        await loadOperations(nextId);
      }
      setMessage(nextStatus === "published" ? "课程已发布，学生端可见" : "草稿已保存，学生暂时看不到");
    } catch (error) {
      setMessage(error.message || "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveContent() {
    if (!selectedId) {
      setMessage("请先保存课程基础信息");
      return;
    }
    const urlError = firstUrlError({ form, detail });
    if (urlError) {
      setMessage(urlError);
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await campAPI.adminSaveContent(selectedId, {
        lessons: detail.lessons.map((lesson, index) => ({
          ...lesson,
          startsAt: fromDateTimeInput(lesson.startsAt),
          sortOrder: index + 1,
        })),
        materials: detail.materials.map((item, index) => ({ ...item, sortOrder: index + 1 })),
        homework: detail.homework,
        aiPractice: detail.aiPractice,
      });
      await loadDetail(selectedId);
      await loadOperations(selectedId);
      setMessage("课程内容已保存，学生学习页会自动更新");
    } catch (error) {
      setMessage(error.message || "内容保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function uploadCoverFile(file) {
    if (!selectedId) {
      setMessage("请先保存课程基础信息，再上传封面");
      return;
    }
    if (!file) return;
    if (!COVER_IMAGE_TYPES.has(file.type)) {
      setMessage("封面图片仅支持 PNG、JPG/JPEG、WEBP");
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      setMessage("封面图片不能超过 5MB");
      return;
    }
    setCoverUploading(true);
    setMessage("");
    try {
      const data = await campAPI.adminUploadCover(selectedId, file);
      const coverUrl = data?.course?.coverUrl || "";
      setForm((current) => ({ ...current, coverUrl }));
      setDetail((current) => ({
        ...current,
        course: current.course ? { ...current.course, coverUrl } : current.course,
      }));
      await loadCourses(selectedId);
      setMessage("封面图片已上传");
    } catch (error) {
      setMessage(error.message || "封面图片上传失败");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  function updateLesson(index, patch) {
    setDetail((current) => ({
      ...current,
      lessons: current.lessons.map((lesson, lessonIndex) => lessonIndex === index ? { ...lesson, ...patch } : lesson),
    }));
  }

  function removeLesson(index) {
    setDetail((current) => {
      const removed = current.lessons[index];
      return {
        ...current,
        lessons: current.lessons.filter((_, lessonIndex) => lessonIndex !== index),
        materials: current.materials.map((item) => item.lessonId === removed?.id ? { ...item, lessonId: "" } : item),
      };
    });
  }

  function updateMaterial(index, patch) {
    setDetail((current) => ({
      ...current,
      materials: current.materials.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  }

  async function duplicateCourse() {
    if (!selectedId) {
      setMessage("请先选择要复制的课程");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const data = await campAPI.adminDuplicateCourse(selectedId);
      const nextId = data?.course?.id;
      await loadCourses(nextId);
      await loadDetail(nextId);
      await loadOperations(nextId);
      setMessage("已复制为草稿，修改时间后即可发布下一期");
    } catch (error) {
      setMessage(error.message || "复制失败");
    } finally {
      setLoading(false);
    }
  }

  async function archiveCourse() {
    if (!selectedId) {
      setMessage("请先选择要归档的课程");
      return;
    }
    if (!window.confirm("确认归档这门课程？归档后学生端将不可见。")) return;
    setLoading(true);
    setMessage("");
    try {
      await campAPI.adminArchiveCourse(selectedId);
      await loadCourses(selectedId);
      await loadDetail(selectedId);
      await loadOperations(selectedId);
      setMessage("课程已归档，学生端不可见");
    } catch (error) {
      setMessage(error.message || "归档失败");
    } finally {
      setLoading(false);
    }
  }

  async function createRedemptionCode() {
    if (!selectedId) {
      setMessage("请先选择课程");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const data = await campAPI.adminCreateRedemptionCode(selectedId, {
        code: redemptionForm.code,
        maxUses: redemptionForm.maxUses,
        expiresAt: fromDateTimeInput(redemptionForm.expiresAt),
      });
      setOperations(normalizeOperations(data));
      setRedemptionForm(EMPTY_REDEMPTION_FORM);
      setMessage("兑换码已创建");
    } catch (error) {
      setMessage(error.message || "兑换码创建失败");
    } finally {
      setLoading(false);
    }
  }

  async function updateRedemptionCode(codeId, status) {
    if (!selectedId) return;
    setLoading(true);
    setMessage("");
    try {
      const data = await campAPI.adminUpdateRedemptionCode(selectedId, codeId, { status });
      setOperations(normalizeOperations(data));
      setMessage(status === "active" ? "兑换码已启用" : "兑换码已停用");
    } catch (error) {
      setMessage(error.message || "兑换码更新失败");
    } finally {
      setLoading(false);
    }
  }

  const publishChecks = [
    { label: "课程名称", ok: Boolean(form.title.trim()) },
    { label: "开课时间", ok: Boolean(form.startsAt) },
    { label: "至少 1 节课", ok: detail.lessons.length > 0 },
    { label: "直播 / 资料链接格式", ok: !firstUrlError({ form, detail }) },
    { label: "作业或 AI 练习入口", ok: Boolean(detail.homework.description || detail.aiPractice.description || detail.aiPractice.targetPage) },
  ];

  return (
    <div style={{ background: "#fff8ee", minHeight: "calc(100vh - 54px)" }}>
      <main style={{ width: "min(1180px, 100%)", margin: "0 auto", padding: isMobile ? "22px 14px 92px" : "30px 20px 64px" }}>
        <section style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#9a6330" }}>平台管理 / 学习营课程</div>
            <h1 style={{ margin: "6px 0 0", fontSize: isMobile ? 24 : 30, lineHeight: 1.15 }}>课程上架、发布和运营维护</h1>
          </div>
          <button type="button" style={buttonStyle} onClick={startNewCourse}>新建课程</button>
        </section>

        {message && <div style={{ border: "1px solid #eadccc", background: "#fff", borderRadius: 8, padding: 12, color: "#6e6258", marginBottom: 14 }}>{message}</div>}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "280px minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
          <aside style={{ border: "1px solid #eadccc", background: "#fff", borderRadius: 8, padding: 12 }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>课程列表</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => selectCourse(course.id)}
                  style={{
                    border: "1px solid #eadccc",
                    borderRadius: 8,
                    background: course.id === selectedId ? "#fff0dc" : "#fff",
                    padding: 10,
                    textAlign: "left",
                    cursor: "pointer",
                    font: "inherit",
                  }}
                >
                  <strong style={{ display: "block", color: "#241b15" }}>{course.title}</strong>
                  <span style={{ color: "#8a7664", fontSize: 12 }}>{course.status} · {course.price?.display || "¥0"}</span>
                </button>
              ))}
              {!courses.length && <div style={{ color: "#8a7664", fontSize: 13 }}>还没有课程，先新建一门。</div>}
            </div>
          </aside>

          <section style={{ display: "grid", gap: 16 }}>
            {selectedCourse && (
              <div style={{ border: "1px solid #eadccc", background: "#fff", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#9a6330" }}>运营看板</div>
                    <h2 style={{ margin: "4px 0 0", fontSize: 18 }}>招生、进度与发布检查</h2>
                  </div>
                  <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#8a2d2d", borderColor: "#d8b4b4", padding: "8px 11px" }} disabled={loading} onClick={archiveCourse}>归档课程</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
                  {[
                    ["报名人数", operations.stats.enrollmentCount],
                    ["兑换开通", operations.stats.redemptionEnrollments],
                    ["平均进度", `${operations.stats.averageProgress}%`],
                    ["课程收入", operations.stats.revenueDisplay],
                  ].map(([label, value]) => (
                    <div key={label} style={{ border: "1px solid #f0e4d6", borderRadius: 8, padding: 12, background: "#fffaf3" }}>
                      <div style={{ color: "#8a7664", fontSize: 12, fontWeight: 800 }}>{label}</div>
                      <strong style={{ display: "block", marginTop: 6, fontSize: 20 }}>{value}</strong>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                  {publishChecks.map((item) => (
                    <span key={item.label} style={{
                      border: `1px solid ${item.ok ? "#b7d8bd" : "#ead0a8"}`,
                      borderRadius: 999,
                      padding: "6px 10px",
                      background: item.ok ? "#f0fff3" : "#fff7e8",
                      color: item.ok ? "#256234" : "#8a5a1d",
                      fontSize: 12,
                      fontWeight: 800,
                    }}>
                      {item.ok ? "已完成" : "待补充"} · {item.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ border: "1px solid #eadccc", background: "#fff", borderRadius: 8, padding: 16 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 18 }}>基础信息</h2>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <Field label="课程名称"><input style={inputStyle} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
                <Field label="状态">
                  <select style={inputStyle} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    <option value="draft">草稿</option>
                    <option value="coming_soon">待发布 / 即将开课</option>
                    <option value="published">报名中 / 已发布</option>
                    <option value="hidden">隐藏</option>
                    <option value="archived">已归档</option>
                  </select>
                </Field>
                <Field label="副标题"><input style={inputStyle} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></Field>
                <Field label="封面图链接"><input style={inputStyle} value={form.coverUrl} onChange={(event) => setForm({ ...form, coverUrl: event.target.value })} /></Field>
                <Field label="活动价（分）"><input style={inputStyle} type="number" min="0" value={form.priceCents} onChange={(event) => setForm({ ...form, priceCents: event.target.value })} /></Field>
                <Field label="开课日期"><input style={inputStyle} type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></Field>
                <Field label="标签（逗号分隔）"><input style={inputStyle} value={form.tagsText} onChange={(event) => setForm({ ...form, tagsText: event.target.value })} /></Field>
              </div>
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                <Field label="课程介绍"><textarea style={{ ...inputStyle, minHeight: 88 }} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
                <Field label="默认直播链接"><input style={inputStyle} value={form.liveUrl} onChange={(event) => setForm({ ...form, liveUrl: event.target.value })} /></Field>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={(event) => uploadCoverFile(event.target.files?.[0])}
                />
                <button
                  type="button"
                  style={{ ...buttonStyle, background: "#fff", color: "#241b15" }}
                  disabled={coverUploading || !selectedId}
                  onClick={() => coverInputRef.current?.click()}
                >
                  {coverUploading ? "上传中..." : "选择图片上传"}
                </button>
                <span style={{ color: "#8a7664", fontSize: 12 }}>支持 PNG、JPG、WEBP，最大 5MB</span>
              </div>
              {form.coverUrl && isValidUrl(form.coverUrl) && (
                <img
                  src={form.coverUrl}
                  alt="课程封面预览"
                  style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 8, border: "1px solid #eadccc", marginTop: 12 }}
                />
              )}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                <button type="button" style={buttonStyle} disabled={loading} onClick={() => saveCourse()}>保存草稿</button>
                <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#241b15" }} disabled={loading} onClick={() => saveCourse("published")}>发布课程</button>
                {selectedCourse && <button type="button" style={{ ...buttonStyle, background: "#f2e7da", color: "#5f4c3d", borderColor: "#eadbc9" }} onClick={duplicateCourse}>复制课程</button>}
                <button type="button" style={{ ...buttonStyle, background: "#f2e7da", color: "#5f4c3d", borderColor: "#eadbc9" }} onClick={() => setPreviewing(true)}>预览课程</button>
              </div>
              <div style={{ color: "#8a7664", fontSize: 12, marginTop: 8 }}>课程上架由平台管理员维护；草稿和隐藏课程学生看不到，发布前必须保存至少 1 节课。</div>
            </div>

            {previewing && (
              <div style={{ border: "1px solid #d6c1aa", background: "#fffaf3", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#9a6330" }}>学生页预览</div>
                    <h2 style={{ margin: "5px 0 4px", fontSize: 22 }}>{form.title || "未命名课程"}</h2>
                    <p style={{ margin: 0, color: "#6e6258" }}>{form.summary || "还没有填写副标题。"}</p>
                  </div>
                  <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#241b15", padding: "8px 11px" }} onClick={() => setPreviewing(false)}>关闭</button>
                </div>
                {form.coverUrl && isValidUrl(form.coverUrl) && (
                  <img
                    src={form.coverUrl}
                    alt="学生页封面预览"
                    style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 8, border: "1px solid #eadccc", marginBottom: 14 }}
                  />
                )}
                <p style={{ margin: "0 0 14px", color: "#6e6258", lineHeight: 1.6 }}>{form.description || "还没有填写课程介绍。"}</p>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr", gap: 12 }}>
                  <div style={{ border: "1px solid #eadccc", borderRadius: 8, padding: 12, background: "#fff" }}>
                    <strong>课程目录</strong>
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {detail.lessons.map((lesson, index) => (
                        <div key={lesson.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderBottom: "1px solid #f0e4d6", paddingBottom: 8 }}>
                          <span>Day {index + 1} · {lesson.title || "未命名小节"}</span>
                          <span style={{ color: "#8a7664" }}>{formatPreviewTime(lesson.startsAt)}</span>
                        </div>
                      ))}
                      {!detail.lessons.length && <span style={{ color: "#8a7664" }}>还没有课程目录。</span>}
                    </div>
                  </div>
                  <div style={{ border: "1px solid #eadccc", borderRadius: 8, padding: 12, background: "#fff" }}>
                    <strong>资料与任务</strong>
                    <div style={{ display: "grid", gap: 8, marginTop: 10, color: "#6e6258" }}>
                      {detail.materials.map((item) => <span key={item.id}>{item.title || "未命名资料"} · {item.type}</span>)}
                      {detail.homework.description && <span>作业 · {detail.homework.description}</span>}
                      {detail.aiPractice.description && <span>AI 练习 · {detail.aiPractice.description}</span>}
                      {!detail.materials.length && !detail.homework.description && !detail.aiPractice.description && <span style={{ color: "#8a7664" }}>还没有资料、作业或 AI 练习。</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ border: "1px solid #eadccc", background: "#fff", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>课程目录</h2>
                <button type="button" style={{ ...buttonStyle, padding: "8px 11px" }} onClick={() => setDetail((current) => ({ ...current, lessons: [...current.lessons, createLesson(current.lessons.length)] }))}>新增节数</button>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {detail.lessons.map((lesson, index) => (
                  <div key={lesson.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "80px 1fr 190px", gap: 8, alignItems: "center" }}>
                    <strong>Day {index + 1}</strong>
                    <input style={inputStyle} aria-label={`Day ${index + 1} 课程标题`} value={lesson.title} onChange={(event) => updateLesson(index, { title: event.target.value })} />
                    <input style={inputStyle} aria-label={`Day ${index + 1} 开课时间`} type="datetime-local" value={lesson.startsAt} onChange={(event) => updateLesson(index, { startsAt: event.target.value })} />
                    <input style={inputStyle} aria-label={`Day ${index + 1} 直播链接`} placeholder="直播链接" value={lesson.liveUrl} onChange={(event) => updateLesson(index, { liveUrl: event.target.value })} />
                    <input style={inputStyle} aria-label={`Day ${index + 1} 回放链接`} placeholder="回放链接" value={lesson.replayUrl} onChange={(event) => updateLesson(index, { replayUrl: event.target.value })} />
                    <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#241b15" }} onClick={() => removeLesson(index)}>删除</button>
                  </div>
                ))}
                {!detail.lessons.length && <div style={{ color: "#8a7664", fontSize: 13 }}>还没有课程目录。</div>}
              </div>
            </div>

            <div style={{ border: "1px solid #eadccc", background: "#fff", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>资料与任务</h2>
                <button type="button" style={{ ...buttonStyle, padding: "8px 11px" }} onClick={() => setDetail((current) => ({ ...current, materials: [...current.materials, createMaterial(current.materials.length)] }))}>新增资料</button>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {detail.materials.map((item, index) => (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 120px 150px 1fr", gap: 8 }}>
                    <input style={inputStyle} aria-label={`资料 ${index + 1} 名称`} placeholder="资料名称" value={item.title} onChange={(event) => updateMaterial(index, { title: event.target.value })} />
                    <select style={inputStyle} value={item.type} onChange={(event) => updateMaterial(index, { type: event.target.value })}>
                      <option value="pdf">PDF</option>
                      <option value="ppt">PPT</option>
                      <option value="doc">Word</option>
                      <option value="image">图片</option>
                      <option value="audio">音频</option>
                    </select>
                    <select style={inputStyle} value={item.lessonId} onChange={(event) => updateMaterial(index, { lessonId: event.target.value })}>
                      <option value="">全课资料</option>
                      {detail.lessons.map((lesson, lessonIndex) => (
                        <option key={lesson.id} value={lesson.id}>Day {lessonIndex + 1}</option>
                      ))}
                    </select>
                    <input style={inputStyle} aria-label={`资料 ${index + 1} 链接`} placeholder="资料链接" value={item.url} onChange={(event) => updateMaterial(index, { url: event.target.value })} />
                    <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#241b15" }} onClick={() => setDetail((current) => ({ ...current, materials: current.materials.filter((_, itemIndex) => itemIndex !== index) }))}>删除</button>
                  </div>
                ))}
                {!detail.materials.length && <div style={{ color: "#8a7664", fontSize: 13 }}>还没有上传资料。MVP 阶段先填写资料链接。</div>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginTop: 14 }}>
                <Field label="作业说明"><textarea style={{ ...inputStyle, minHeight: 76 }} value={detail.homework.description} onChange={(event) => setDetail((current) => ({ ...current, homework: { ...current.homework, description: event.target.value } }))} /></Field>
                <Field label="AI 练习入口">
                  <div style={{ display: "grid", gap: 8 }}>
                    <input style={inputStyle} placeholder="说明" value={detail.aiPractice.description} onChange={(event) => setDetail((current) => ({ ...current, aiPractice: { ...current.aiPractice, description: event.target.value } }))} />
                    <input style={inputStyle} placeholder="页面 ID，例如 writing" value={detail.aiPractice.targetPage} onChange={(event) => setDetail((current) => ({ ...current, aiPractice: { ...current.aiPractice, targetPage: event.target.value } }))} />
                  </div>
                </Field>
              </div>
              <div style={{ marginTop: 14 }}>
                <button type="button" style={buttonStyle} disabled={loading || !selectedId} onClick={saveContent}>保存课程内容</button>
              </div>
            </div>

            {selectedCourse && (
              <div style={{ border: "1px solid #eadccc", background: "#fff", borderRadius: 8, padding: 16 }}>
                <h2 style={{ margin: "0 0 14px", fontSize: 18 }}>学员运营</h2>
                <div style={{ display: "grid", gap: 8 }}>
                  {operations.enrollments.map((item) => (
                    <div key={item.enrollment.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 110px 130px 130px", gap: 10, alignItems: "center", border: "1px solid #f0e4d6", borderRadius: 8, padding: 10 }}>
                      <div>
                        <strong>{item.user.name}</strong>
                        <div style={{ color: "#8a7664", fontSize: 12 }}>{item.user.phone || item.user.email || item.user.accountCode || item.user.id}</div>
                      </div>
                      <span>{item.progress.progressPercent}%</span>
                      <span style={{ color: "#8a7664", fontSize: 12 }}>{item.enrollment.sourceType}</span>
                      <span style={{ color: "#8a7664", fontSize: 12 }}>{formatDateTime(item.enrollment.enrolledAt)}</span>
                    </div>
                  ))}
                  {!operations.enrollments.length && <div style={{ color: "#8a7664", fontSize: 13 }}>还没有学员开通这门课。</div>}
                </div>
              </div>
            )}

            {selectedCourse && (
              <div style={{ border: "1px solid #eadccc", background: "#fff", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 18 }}>兑换码</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 110px 190px auto", gap: 8, marginBottom: 12 }}>
                  <input style={inputStyle} aria-label="兑换码内容" placeholder="留空自动生成，或输入自定义兑换码" value={redemptionForm.code} onChange={(event) => setRedemptionForm({ ...redemptionForm, code: event.target.value })} />
                  <input style={inputStyle} aria-label="兑换码最大使用次数" type="number" min="1" value={redemptionForm.maxUses} onChange={(event) => setRedemptionForm({ ...redemptionForm, maxUses: event.target.value })} />
                  <input style={inputStyle} aria-label="兑换码过期时间" type="datetime-local" value={redemptionForm.expiresAt} onChange={(event) => setRedemptionForm({ ...redemptionForm, expiresAt: event.target.value })} />
                  <button type="button" style={buttonStyle} disabled={loading || !selectedId} onClick={createRedemptionCode}>生成兑换码</button>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {operations.redemptions.map((item) => (
                    <div key={item.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 120px 120px 160px auto", gap: 10, alignItems: "center", border: "1px solid #f0e4d6", borderRadius: 8, padding: 10 }}>
                      <strong>{item.code}</strong>
                      <span>{item.usedCount}/{item.maxUses}</span>
                      <span style={{ color: item.status === "active" ? "#256234" : "#8a7664" }}>{item.status}</span>
                      <span style={{ color: "#8a7664", fontSize: 12 }}>{item.expiresAt ? formatDateTime(item.expiresAt) : "长期有效"}</span>
                      <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#241b15", padding: "8px 11px" }} disabled={loading} onClick={() => updateRedemptionCode(item.id, item.status === "active" ? "disabled" : "active")}>
                        {item.status === "active" ? "停用" : "启用"}
                      </button>
                    </div>
                  ))}
                  {!operations.redemptions.length && <div style={{ color: "#8a7664", fontSize: 13 }}>还没有兑换码。</div>}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
