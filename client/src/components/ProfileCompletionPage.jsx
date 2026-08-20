import { useState } from "react";

import { classesAPI } from "../api/index.js";
import { card, inp, SURFACE_SPACING } from "../constants/index.jsx";
import useIsMobile from "../hooks/useIsMobile.js";
import useScrollReveal from "../hooks/useScrollReveal.js";

function ProfileHeader({ isMobile, isTeacher }) {
  return (
    <div style={{ textAlign: "center", marginBottom: isMobile ? 22 : 32 }}>
      <h1 style={{ fontSize: isMobile ? 34 : 48, fontWeight: 700, letterSpacing: isMobile ? "-1px" : "-2px", fontFamily: "'Georgia',serif", color: "#111", margin: "0 0 10px" }}>
        {isTeacher ? "创建班级" : "加入班级"}
      </h1>
      <p style={{ fontSize: isMobile ? 13 : 14, color: "#888", lineHeight: 1.75 }}>
        {isTeacher ? "先创建你的首个班级，再进入系统" : "可以先搜索班级加入，也可以稍后再处理"}
      </p>
    </div>
  );
}

function CurrentUserCard({ user }) {
  return (
    <div style={{ background: "#f8f8f8", border: "1px solid #e8e8e8", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>当前姓名</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{user?.realName || user?.name || "未命名用户"}</div>
      <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>姓名已在注册时确认，当前不支持修改。</div>
    </div>
  );
}

function TeacherClassForm({ newClassName, newClassPwd, setNewClassName, setNewClassPwd }) {
  return (
    <div style={{ borderTop: "1px solid #e8e8e8", paddingTop: 20 }}>
      <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 12, fontWeight: 700 }}>创建首个班级</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input aria-label="班级名称" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="班级名称（如：高三1班）" style={inp()} />
        <input aria-label="班级密码" value={newClassPwd} onChange={(e) => setNewClassPwd(e.target.value)} placeholder="设置班级密码" style={inp()} />
      </div>
    </div>
  );
}

function FoundClassCard({ classPassword, foundClass, joinClass, loading, setClassPassword }) {
  if (!foundClass) return null;
  return (
    <div style={{ background: "#edfaf3", border: "1px solid #a8e8c8", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ fontWeight: 700, color: "#1a7a4a", marginBottom: 4 }}>✓ 找到班级：{foundClass.className}</div>
      <div style={{ fontSize: 12, color: "#5a8a6a", marginBottom: 4 }}>教师：{foundClass.teacherName}</div>
      <div style={{ fontSize: 12, color: "#6b8b74", marginBottom: 8 }}>班级号：{foundClass.classCode} · 当前 {foundClass.studentCount || 0} 人</div>
      <input aria-label="班级密码" type="password" value={classPassword} onChange={(e) => setClassPassword(e.target.value)} placeholder="输入班级密码" style={{ ...inp(), marginBottom: 8 }} />
      <button type="button" aria-label="加入班级" onClick={joinClass} disabled={loading} style={{ width: "100%", padding: "8px", background: "#1a7a4a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
        {loading ? "加入中..." : "加入班级"}
      </button>
    </div>
  );
}

function StudentClassForm({ classCode, classPassword, foundClass, isMobile, joinClass, loading, searchClass, searching, setClassCode, setClassPassword }) {
  return (
    <div style={{ borderTop: "1px solid #e8e8e8", paddingTop: 20 }}>
      <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 5 }}>班级号</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexDirection: isMobile ? "column" : "row" }}>
        <input aria-label="班级号" value={classCode} onChange={(e) => setClassCode(e.target.value)} placeholder="输入班级号（如：2024A01）" style={{ ...inp(), flex: 1 }} />
        <button type="button" aria-label="搜索班级" onClick={searchClass} disabled={searching} style={{ padding: "9px 18px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: 8, color: "#555", fontSize: 13, cursor: "pointer", width: isMobile ? "100%" : "auto" }}>
          {searching ? "搜索中..." : "搜索"}
        </button>
      </div>
      <FoundClassCard classPassword={classPassword} foundClass={foundClass} joinClass={joinClass} loading={loading} setClassPassword={setClassPassword} />
    </div>
  );
}

function ActionButtons({ createClassForTeacher, isMobile, isTeacher, loading, onComplete, onSkip, user }) {
  if (isTeacher) {
    return (
      <button type="button" aria-label="创建班级并进入系统" onClick={createClassForTeacher} disabled={loading} style={{ flex: 1, padding: "13px", background: loading ? "#ccc" : "#111", border: "none", borderRadius: 24, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
        {loading ? "创建中..." : "创建班级并进入系统"}
      </button>
    );
  }

  return (
    <>
      <button type="button" onClick={() => onComplete(user)} disabled={loading} style={{ flex: 1, padding: "13px", background: loading ? "#ccc" : "#111", border: "none", borderRadius: 24, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
        先进入系统
      </button>
      <button type="button" onClick={onSkip} style={{ padding: "13px 24px", background: "transparent", border: "1px solid #ddd", borderRadius: 24, color: "#888", fontSize: 15, cursor: "pointer", width: isMobile ? "100%" : "auto" }}>
        跳过
      </button>
    </>
  );
}

export default function ProfileCompletionPage({ user, onComplete, onSkip }) {
  const pageRef = useScrollReveal();
  const isMobile = useIsMobile();
  const [classCode, setClassCode] = useState("");
  const [classPassword, setClassPassword] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundClass, setFoundClass] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassPwd, setNewClassPwd] = useState("");

  const isTeacher = user?.role === "teacher";

  const searchClass = async () => {
    if (!classCode.trim()) {
      setError("请输入班级号");
      return;
    }
    setSearching(true);
    setError("");
    setFoundClass(null);
    try {
      const cls = await classesAPI.search(classCode.trim());
      setFoundClass(cls);
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  };

  const joinClass = async () => {
    if (!foundClass) return;
    setLoading(true);
    setError("");
    try {
      const data = await classesAPI.join(foundClass.id, classPassword);
      onComplete(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const createClassForTeacher = async () => {
    if (!newClassName.trim()) {
      setError("请输入班级名称");
      return;
    }
    if (!newClassPwd.trim()) {
      setError("请设置班级密码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const newClass = await classesAPI.create(newClassName.trim(), newClassPwd.trim());
      const updatedUser = await classesAPI.bindTeacherClass(newClass.id);
      onComplete(updatedUser);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={pageRef} className="studio-reveal" style={{ minHeight: "100vh", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 12 : 20 }}>
      <div style={{ width: "100%", maxWidth: 500 }}>
        <ProfileHeader isMobile={isMobile} isTeacher={isTeacher} />
        <div style={{ ...card, padding: isMobile ? 18 : 32, marginBottom: SURFACE_SPACING.stack }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <CurrentUserCard user={user} />

            {isTeacher ? (
              <TeacherClassForm newClassName={newClassName} newClassPwd={newClassPwd} setNewClassName={setNewClassName} setNewClassPwd={setNewClassPwd} />
            ) : (
              <StudentClassForm classCode={classCode} classPassword={classPassword} foundClass={foundClass} isMobile={isMobile} joinClass={joinClass} loading={loading} searchClass={searchClass} searching={searching} setClassCode={setClassCode} setClassPassword={setClassPassword} />
            )}

            {error ? <div style={{ fontSize: 13, color: "#b02020", background: "#fdf0ef", border: "1px solid #f0b0a8", borderRadius: 8, padding: "8px 12px" }}>{error}</div> : null}

            <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
              <ActionButtons createClassForTeacher={createClassForTeacher} isMobile={isMobile} isTeacher={isTeacher} loading={loading} onComplete={onComplete} onSkip={onSkip} user={user} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
