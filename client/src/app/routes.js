const ROUTE_PATTERNS = [
  { page: "portal", match: (pathname) => pathname === "/" },
  { page: "explore", match: (pathname) => pathname === "/explore" },
  { page: "resume", match: (pathname) => pathname === "/resume" },
  { page: "megan", match: (pathname) => pathname === "/megan" },
  { page: "skill-training", match: (pathname) => pathname === "/prep" || pathname === "/skills" },
  { page: "language-foundation", match: (pathname) => pathname === "/foundation" },
  { page: "grammar-analyzer", match: (pathname) => pathname === "/grammar" },
  { page: "grammar-analyzer", match: (pathname) => pathname === "/grammar/analyzer" },
  { page: "grammar-courses", match: (pathname) => pathname === "/grammar/courses" },
  { page: "grammar-practice", match: (pathname) => pathname === "/grammar/practice" },
  { page: "grammar-progress", match: (pathname) => pathname === "/grammar/progress" },
  { page: "grammar-quiz", match: (pathname) => pathname === "/grammar/quiz" },
  { page: "reading-analyzer", match: (pathname) => pathname === "/reading" },
  { page: "reading-analyzer", match: (pathname) => pathname === "/reading/analyzer" },
  { page: "reading-practice", match: (pathname) => pathname === "/reading/practice" },
  { page: "reading-courses", match: (pathname) => pathname === "/reading/courses" },
  { page: "reading-paper", match: (pathname) => pathname === "/reading/paper" },
  { page: "reading-progress", match: (pathname) => pathname === "/reading/progress" },
  { page: "phonetics-camp", match: (pathname) => pathname === "/phonetics/camp" },
  { page: "phonetics-overview", match: (pathname) => pathname === "/phonetics" },
  { page: "phonetics-sound", match: (pathname) => pathname === "/phonetics/sound" },
  { page: "phonetics-overview", match: (pathname) => pathname === "/phonetics/combos" },
  { page: "phonetics-syllable", match: (pathname) => pathname === "/phonetics/syllable" },
  { page: "phonetics-overview", match: (pathname) => pathname === "/phonetics/words" },
  { page: "phonetics-sentence", match: (pathname) => pathname === "/phonetics/sentence" },
  { page: "phonetics-discourse", match: (pathname) => pathname === "/phonetics/discourse" },
  { page: "phonetics-progress", match: (pathname) => pathname === "/phonetics/progress" },
  { page: "vocab-analyzer", match: (pathname) => pathname === "/vocab" },
  { page: "vocab-progress", match: (pathname) => pathname === "/vocab/progress" },
  { page: "vocab-resources", match: (pathname) => pathname === "/vocab/resources" || pathname === "/vocab/reading" || pathname === "/vocab/writing" || pathname === "/vocab/synonym" || pathname === "/vocab/import" },
  { page: "vocab-quiz", match: (pathname) => pathname === "/vocab/flashcard" },
  { page: "vocab-analyzer", match: (pathname) => pathname === "/vocab/analyzer" },
  { page: "vocab-courses", match: (pathname) => pathname === "/vocab/courses" },
  { page: "vocab-quiz", match: (pathname) => pathname === "/vocab/quiz" },
  { page: "listening-basics", match: (pathname) => pathname === "/listening" || pathname === "/listening/basics" },
  { page: "listening-advanced", match: (pathname) => pathname === "/listening/advanced" },
  { page: "listening-practice", match: (pathname) => pathname === "/listening/practice" },
  { page: "listening-progress", match: (pathname) => pathname === "/listening/progress" },
  { page: "camp", match: (pathname) => pathname === "/camp" },
  { page: "camp-redeem", match: (pathname) => pathname === "/camp/redeem" },
  { page: "speaking", match: (pathname) => pathname === "/speaking" },
  { page: "speaking-progress", match: (pathname) => pathname === "/speaking/progress" },
  { page: "plan", match: (pathname) => pathname === "/plan" },
  { page: "auth", match: (pathname) => pathname === "/auth" },
  { page: "privacy", match: (pathname) => pathname === "/privacy" },
  { page: "agreement", match: (pathname) => pathname === "/agreement" },
  { page: "refund", match: (pathname) => pathname === "/refund" },
  // Writing pages — /writing/... is canonical; legacy /experience/* and /app/* kept for backward compatibility
  { page: "writing", match: (pathname) => pathname === "/writing/grade" || pathname === "/app/write" || pathname === "/experience/write" },
  { page: "writing-bank", match: (pathname) => pathname === "/writing/practice" || pathname === "/experience/practice" },
  { page: "records", match: (pathname) => pathname === "/writing/records" },
  { page: "writing-refine-sentence", match: (pathname) => pathname === "/writing/refine" },
  { page: "writing-refine-sentence", match: (pathname) => pathname === "/writing/refine/sentence" },
  { page: "writing-refine-structure", match: (pathname) => pathname === "/writing/refine/structure" },
  // App (teacher + student authenticated)
  { page: "tasks", match: (pathname) => pathname === "/app/tasks" },
  { page: "parent-home", match: (pathname) => pathname === "/app/parent" },
  { page: "growth", match: (pathname) => pathname === "/growth" || pathname === "/app/records" },
  { page: "workbench", match: (pathname) => pathname === "/app/workbench" },
  { page: "teacher-prep", match: (pathname) => pathname === "/app/teacher-prep" },
  { page: "teacher-data", match: (pathname) => pathname === "/app/teacher-data" },
  { page: "grammar-workbench", match: (pathname) => pathname === "/app/grammar-workbench" },
  { page: "reading-workbench", match: (pathname) => pathname === "/app/reading-workbench" },
  { page: "listening-workbench", match: (pathname) => pathname === "/app/listening-workbench" },
  { page: "vocab-workbench", match: (pathname) => pathname === "/app/vocab-workbench" },
  { page: "phonetics-workbench", match: (pathname) => pathname === "/app/phonetics-workbench" },
  { page: "speaking-workbench", match: (pathname) => pathname === "/app/speaking-workbench" },
  { page: "camp-management", match: (pathname) => pathname === "/app/camp-management" },
  { page: "question-bank", match: (pathname) => pathname === "/app/question-bank" },
  { page: "vocab-content", match: (pathname) => pathname === "/app/vocab-content" },
  { page: "messages", match: (pathname) => pathname === "/app/messages" },
  { page: "classes", match: (pathname) => pathname === "/app/classes" },
  { page: "assignment-create", match: (pathname) => pathname === "/app/assignments" },
  { page: "teacher-todo", match: (pathname) => pathname === "/app/todo" },
  { page: "substitute-upload", match: (pathname) => pathname === "/app/substitute-upload" },
  { page: "batch-grading", match: (pathname) => pathname === "/app/batch-grading" },
  { page: "account", match: (pathname) => pathname === "/app/account" },
  { page: "mine", match: (pathname) => pathname === "/app/mine" },
  { page: "points", match: (pathname) => pathname === "/app/points" },
  { page: "quota", match: (pathname) => pathname === "/app/quota" },
  { page: "admin", match: (pathname) => pathname === "/app/admin" },
];

const PATHNAME_BY_PAGE = {
  portal: "/",
  home: "/",
  explore: "/explore",
  resume: "/resume",
  megan: "/megan",
  "skill-training": "/prep",
  "language-foundation": "/foundation",
  "writing": "/writing/grade",
  "writing-manual": "/writing/grade",
  "writing-bank": "/writing/practice",
  records: "/writing/records",
  "writing-refine": "/writing/refine/sentence",
  "writing-refine-sentence": "/writing/refine/sentence",
  "writing-refine-structure": "/writing/refine/structure",
  grammar: "/grammar/analyzer",
  "grammar-analyzer": "/grammar/analyzer",
  "grammar-courses": "/grammar/courses",
  "grammar-practice": "/grammar/practice",
  "grammar-progress": "/grammar/progress",
  "grammar-quiz": "/grammar/quiz",
  reading: "/reading/analyzer",
  "reading-analyzer": "/reading/analyzer",
  "reading-practice": "/reading/practice",
  "reading-courses": "/reading/courses",
  "reading-paper": "/reading/paper",
  "reading-progress": "/reading/progress",
  phonetics: "/phonetics",
  "phonetics-camp": "/phonetics/camp",
  "phonetics-overview": "/phonetics",
  "phonetics-sound": "/phonetics/sound",
  "phonetics-syllable": "/phonetics/syllable",
  "phonetics-sentence": "/phonetics/sentence",
  "phonetics-discourse": "/phonetics/discourse",
  "phonetics-progress": "/phonetics/progress",
  vocab: "/vocab/analyzer",
  "vocab-reading": "/vocab/resources",
  "vocab-writing": "/vocab/resources",
  "vocab-synonym": "/vocab/resources",
  "vocab-flashcard": "/vocab/quiz",
  "vocab-import": "/vocab/resources",
  "vocab-progress": "/vocab/progress",
  "vocab-resources": "/vocab/resources",
  "vocab-analyzer": "/vocab/analyzer",
  "vocab-courses": "/vocab/courses",
  "vocab-quiz": "/vocab/quiz",
  listening: "/listening/basics",
  "listening-basics": "/listening/basics",
  "listening-advanced": "/listening/advanced",
  "listening-practice": "/listening/practice",
  "listening-progress": "/listening/progress",
  camp: "/camp",
  "camp-redeem": "/camp/redeem",
  speaking: "/speaking",
  "speaking-progress": "/speaking/progress",
  plan: "/plan",
  auth: "/auth",
  privacy: "/privacy",
  agreement: "/agreement",
  refund: "/refund",
  tasks: "/app/tasks",
  "parent-home": "/app/parent",
  growth: "/growth",
  workbench: "/app/workbench",
  "teacher-prep": "/app/teacher-prep",
  "teacher-data": "/app/teacher-data",
  "grammar-workbench": "/app/grammar-workbench",
  "reading-workbench": "/app/reading-workbench",
  "listening-workbench": "/app/listening-workbench",
  "vocab-workbench": "/app/vocab-workbench",
  "phonetics-workbench": "/app/phonetics-workbench",
  "speaking-workbench": "/app/speaking-workbench",
  "camp-management": "/app/camp-management",
  "question-bank": "/app/question-bank",
  "vocab-content": "/app/vocab-content",
  "messages": "/app/messages",
  classes: "/app/classes",
  "assignment-create": "/app/assignments",
  "teacher-todo": "/app/todo",
  "substitute-upload": "/app/substitute-upload",
  "batch-grading": "/app/batch-grading",
  account: "/app/account",
  mine: "/app/mine",
  points: "/app/points",
  quota: "/app/quota",
  admin: "/app/admin",
};

function readSearchParams(search = "") {
  return new URLSearchParams(search);
}

function resolveWritingDetail(pathname) {
  const match = pathname.match(/^\/app\/writings\/([^/]+)$/);
  if (!match) return null;
  return match[1] || "";
}

function resolveCampCourseDetail(pathname) {
  const match = pathname.match(/^\/camp\/courses\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function resolveCampMyCourseDetail(pathname) {
  const match = pathname.match(/^\/camp\/my-courses\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function getBaseRouteState(searchParams) {
  return {
    selectedTeacherWritingContext: null,
    selectedTeacherAssignmentId: searchParams.get("assignmentId") || "",
    selectedStudentViewingWritingId: searchParams.get("writingId") || "",
    selectedTeacherTodoScene: searchParams.get("scene") || "gradings",
    accountTab: searchParams.get("tab") || "profile",
    lab: searchParams.get("lab") || "",
    selectedCampCourseId: "",
    selectedCampMyCourseId: "",
  };
}

function readTeacherWritingRoute(writingId, searchParams) {
  return {
    ...getBaseRouteState(searchParams),
    page: "teacher-writing-detail",
    selectedTeacherWritingContext: {
      writingId,
      classId: searchParams.get("classId") || null,
      tab: searchParams.get("tab") || null,
    },
    selectedTeacherAssignmentId: "",
    selectedStudentViewingWritingId: "",
  };
}

export function readRouteState(locationLike = window.location) {
  const pathname = locationLike?.pathname || "/";
  const searchParams = readSearchParams(locationLike?.search || "");
  const writingId = resolveWritingDetail(pathname);
  const campCourseId = resolveCampCourseDetail(pathname);
  const campMyCourseId = resolveCampMyCourseDetail(pathname);

  if (writingId) {
    return readTeacherWritingRoute(writingId, searchParams);
  }

  if (campCourseId) {
    return {
      ...getBaseRouteState(searchParams),
      page: "camp-course-detail",
      selectedCampCourseId: campCourseId,
    };
  }

  if (campMyCourseId) {
    return {
      ...getBaseRouteState(searchParams),
      page: "camp-my-course-detail",
      selectedCampMyCourseId: campMyCourseId,
    };
  }

  const matchedRoute = ROUTE_PATTERNS.find((item) => item.match(pathname));
  return {
    ...getBaseRouteState(searchParams),
    page: matchedRoute?.page || "portal",
  };
}

function appendQuery(pathname, params) {
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

function buildRouteParams(routeState) {
  const params = new URLSearchParams();
  const entriesByPage = {
    "assignment-create": [["assignmentId", routeState.selectedTeacherAssignmentId]],
    records: [["writingId", routeState.selectedStudentViewingWritingId]],
    "teacher-todo": [["scene", routeState.selectedTeacherTodoScene]],
    account: routeState.accountTab && routeState.accountTab !== "profile" ? [["tab", routeState.accountTab]] : [],
  };
  const entries = entriesByPage[routeState.page] || [];

  for (const [key, value] of entries) {
    if (value) params.set(key, String(value));
  }
  if (routeState.lab) params.set("lab", String(routeState.lab));

  return params;
}

function buildTeacherWritingUrl(routeState) {
  const { selectedTeacherWritingContext } = routeState;
  const params = new URLSearchParams();

  if (selectedTeacherWritingContext?.classId) {
    params.set("classId", String(selectedTeacherWritingContext.classId));
  }
  if (selectedTeacherWritingContext?.tab) {
    params.set("tab", String(selectedTeacherWritingContext.tab));
  }
  if (routeState.lab) params.set("lab", String(routeState.lab));

  return appendQuery(
    `/app/writings/${encodeURIComponent(String(selectedTeacherWritingContext.writingId))}`,
    params
  );
}

function buildCampCourseUrl(routeState) {
  return `/camp/courses/${encodeURIComponent(String(routeState.selectedCampCourseId || ""))}`;
}

function buildCampMyCourseUrl(routeState) {
  return `/camp/my-courses/${encodeURIComponent(String(routeState.selectedCampMyCourseId || ""))}`;
}

export function buildRouteUrl(routeState) {
  if (routeState.page === "teacher-writing-detail" && routeState.selectedTeacherWritingContext?.writingId) {
    return buildTeacherWritingUrl(routeState);
  }
  if (routeState.page === "camp-course-detail" && routeState.selectedCampCourseId) {
    return buildCampCourseUrl(routeState);
  }
  if (routeState.page === "camp-my-course-detail" && routeState.selectedCampMyCourseId) {
    return buildCampMyCourseUrl(routeState);
  }

  return appendQuery(
    PATHNAME_BY_PAGE[routeState.page] || "/",
    buildRouteParams(routeState)
  );
}
