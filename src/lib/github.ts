import { getGithubToken } from "./firebase";

const REPO_OWNER = "devtoprod95";
const REPO_NAME = "dailypharm-survey";
const ASSETS_DIR = "public/assets";

/**
 * 설문지명으로 시작하는 저장소(`public/assets/`)의 모든 이미지 파일을 조회하여
 * GitHub 저장소(main 브랜치)에서 삭제한다.
 *
 * - `{설문지명}_0.png`, `{설문지명}_1.png` 등 번호가 붙은 모든 파일은 물론,
 *   아직 배포되지 않은 `{설문지명}_0_pending.png` 같은 대기 파일,
 *   그리고 과거에 남겨진 고아 파일까지 접두어 기준으로 전부 제거한다.
 * - 단일 커밋(Git Tree API)으로 원자적으로 처리한다.
 * - 삭제 대상 파일이 없으면 아무 작업도 하지 않는다.
 * - best-effort: 호출 측에서 실패를 흡수할 수 있도록 에러를 그대로 throw 한다.
 *
 * @param surveyName 설문지명(파일 접두어). 영문/숫자/_/- 로만 구성됨.
 */
export async function deleteImagesFromRepo(surveyName: string): Promise<void> {
  if (!surveyName) return;

  const token = await getGithubToken();
  const headers = {
    Authorization: `token ${token}`,
    "Content-Type": "application/json",
  };

  // 1. public/assets 디렉터리 목록 조회
  const listRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${ASSETS_DIR}?ref=main`,
    { headers }
  );

  // 디렉터리가 없으면(404) 삭제할 것도 없음
  if (listRes.status === 404) return;
  if (!listRes.ok) throw new Error("GitHub assets 디렉터리 조회에 실패했습니다.");

  const entries: Array<{ name: string; path: string; type: string }> = await listRes.json();

  // 2. 설문지명 접두어로 시작하는 파일만 선별
  //    `{설문지명}_` 로 시작해야 하며(언더스코어로 경계 구분), 파일 타입만 대상.
  //    예) name="survey_1" 일 때 survey_1_0.png 는 매칭, survey_12_0.png 는 비매칭
  const prefix = `${surveyName}_`;
  const targets = entries.filter(
    (e) => e.type === "file" && e.name.startsWith(prefix)
  );

  if (targets.length === 0) return;

  // 3. main 브랜치 최신 커밋(Ref) 조회
  const refRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/main`,
    { headers }
  );
  if (!refRes.ok) throw new Error("GitHub Refs 정보를 가져오는데 실패했습니다.");
  const refData = await refRes.json();
  const parentCommitSha = refData.object.sha;

  // 4. 부모 커밋의 트리 SHA 조회
  const commitRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${parentCommitSha}`,
    { headers }
  );
  if (!commitRes.ok) throw new Error("GitHub 커밋 정보를 가져오는데 실패했습니다.");
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;

  // 5. 삭제 트리 노드 구성 (sha: null → 해당 경로 파일 삭제)
  const treeNodes = targets.map((t) => ({
    path: t.path,
    mode: "100644",
    type: "blob",
    sha: null,
  }));

  // 6. 새 트리 생성
  const treeRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeNodes }),
    }
  );
  if (!treeRes.ok) throw new Error("GitHub 새 트리 생성에 실패했습니다.");
  const treeData = await treeRes.json();
  const newTreeSha = treeData.sha;

  // 7. 삭제 커밋 생성
  const newCommitRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: `[이미지 삭제] 설문지 '${surveyName}' 삭제 - 관련 이미지 ${treeNodes.length}개 전체 제거`,
        tree: newTreeSha,
        parents: [parentCommitSha],
      }),
    }
  );
  if (!newCommitRes.ok) throw new Error("GitHub 삭제 커밋 생성에 실패했습니다.");
  const newCommitData = await newCommitRes.json();
  const newCommitSha = newCommitData.sha;

  // 8. main 브랜치 Ref 업데이트
  const updateRefRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/main`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ sha: newCommitSha, force: false }),
    }
  );
  if (!updateRefRes.ok) throw new Error("GitHub 메인 브랜치 업데이트에 실패했습니다.");
}
