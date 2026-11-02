---
title: 'Docker와 Kubernetes 정리: 빌드부터 레지스트리, 서버 운영까지'
description: '컨테이너 개념, 이미지 빌드, 레지스트리 push/pull, 서버에서 Docker와 Kubernetes가 어떻게 다른지 정리했습니다.'
pubDate: '2026-11-03'
---

"Docker랑 Kubernetes가 뭐가 달라요?"라는 질문에는 한 줄로 답할 수 있습니다.

> **Docker는 컨테이너를 만들고 실행하는 도구이고, Kubernetes는 수많은 컨테이너를 여러 서버에 걸쳐 운영하는 도구입니다.**

경쟁 관계가 아니라 층이 다릅니다. Docker로 만든 이미지를 Kubernetes가 받아서 돌립니다. 이 글에서는 컨테이너 개념부터 이미지 빌드, 레지스트리 활용, 그리고 서버에서 둘이 어떻게 다르게 동작하는지까지 정리합니다.

---

## 1. 컨테이너란?

컨테이너는 **애플리케이션과 그 실행 환경(런타임, 라이브러리, 설정)을 하나로 묶어 격리된 프로세스로 실행**하는 기술입니다.

| | 가상 머신 (VM) | 컨테이너 |
|---|---|---|
| 격리 단위 | OS 전체 (게스트 커널 포함) | 프로세스 |
| 커널 | VM마다 따로 | **호스트 커널 공유** |
| 크기 | 수 GB | 수십~수백 MB |
| 시작 시간 | 수십 초~분 | 1초 이내 |
| 격리 수준 | 강함 | 상대적으로 약함 |

컨테이너는 리눅스 커널의 두 가지 기능으로 만들어집니다.

- **namespace**: 프로세스, 네트워크, 파일 시스템, 사용자 등을 분리해서 "나만 있는 것처럼" 보이게 함
- **cgroup**: CPU, 메모리, I/O 사용량을 제한

그래서 "내 컴퓨터에선 되는데 서버에선 안 돼요" 문제가 사라집니다. 실행 환경째로 배포하기 때문입니다.

> 컨테이너는 리눅스 기술이라서, macOS와 Windows의 Docker Desktop은 내부에 작은 리눅스 VM을 띄우고 그 안에서 컨테이너를 실행합니다.

---

## 2. Docker 핵심 개념

| 용어 | 설명 | 비유 |
|---|---|---|
| **Dockerfile** | 이미지를 만드는 레시피 | 설계도 |
| **Image** | 실행에 필요한 모든 것을 담은 읽기 전용 패키지 | 클래스 |
| **Container** | 이미지를 실행한 인스턴스 | 객체 |
| **Layer** | 이미지를 구성하는 읽기 전용 층. Dockerfile 명령 하나가 보통 층 하나 | 캐시 단위 |
| **Registry** | 이미지를 저장하고 공유하는 저장소 | GitHub의 이미지 버전 |

Docker 내부는 `docker` CLI → `dockerd`(데몬) → `containerd` → `runc` 순서로 동작합니다. 이미지 형식은 **OCI(Open Container Initiative) 표준**이라서, Docker로 만든 이미지를 Podman, containerd, Kubernetes 어디서든 쓸 수 있습니다.

---

## 3. 이미지 빌드하기

### Dockerfile 예시: FastAPI

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# 1) 의존성 먼저 복사하고 설치 → 코드만 바뀌면 이 레이어는 캐시 재사용
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2) 소스 코드는 나중에 복사
COPY app ./app

# 3) root가 아닌 사용자로 실행
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**레이어 캐시가 핵심입니다.** Docker는 위에서부터 레이어를 쌓고, 어떤 레이어가 바뀌면 그 아래 레이어는 전부 다시 빌드합니다. 그래서 **자주 바뀌지 않는 것(의존성)을 위에, 자주 바뀌는 것(소스 코드)을 아래에** 두어야 빌드가 빨라집니다.

`.dockerignore`도 꼭 만드세요. 빌드에 불필요한 파일이 이미지에 들어가는 것을 막고, 빌드 속도도 빨라집니다.

```
.git
.venv
__pycache__
node_modules
.env
```

`.env`를 빼먹으면 **비밀값이 이미지에 그대로 박혀서 레지스트리에 올라갑니다.** 꼭 확인하세요.

### 멀티 스테이지 빌드: Astro 정적 사이트

빌드 도구는 필요하지만 실행할 때는 필요 없는 경우, 스테이지를 나눠서 **결과물만** 최종 이미지에 담습니다.

```dockerfile
# 1단계: 빌드 (Node.js 필요)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2단계: 실행 (nginx만 있으면 됨)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

Node.js와 `node_modules`는 1단계에만 있고, 최종 이미지에는 nginx와 HTML 파일만 남습니다. 이미지 크기가 수백 MB에서 수십 MB로 줄어듭니다.

### 빌드와 실행 명령어

```bash
# 빌드
docker build -t gelog-api:0.1.0 .

# 실행
docker run -d \
  --name api \
  -p 8000:8000 \
  -e DATABASE_URL=postgres://... \
  -v api-data:/app/data \
  --restart unless-stopped \
  --memory 512m --cpus 1 \
  gelog-api:0.1.0
# -p        호스트 8000 → 컨테이너 8000
# -v        볼륨: 컨테이너가 지워져도 데이터 유지
# --restart 컨테이너가 죽거나 서버가 재부팅되면 자동 재시작
# --memory, --cpus  리소스 제한

# 관리
docker ps                        # 실행 중인 컨테이너
docker logs -f api               # 로그 보기
docker exec -it api sh           # 컨테이너 안으로 들어가기
docker stop api && docker rm api
docker images                    # 로컬 이미지 목록
docker system prune              # 안 쓰는 이미지, 컨테이너 정리
```

### ⚠️ Apple Silicon Mac에서 빌드할 때

M1 이후의 Mac은 **arm64**, 대부분의 클라우드 서버는 **amd64(x86_64)** 입니다. Mac에서 그냥 빌드한 이미지를 서버에서 실행하면 이런 에러가 납니다.

```
exec /usr/local/bin/uvicorn: exec format error
```

`buildx`로 서버 아키텍처를 지정하거나, 둘 다 지원하는 멀티 아키텍처 이미지를 만들면 됩니다.

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/kimgeuneon/gelog-api:0.1.0 \
  --push .
```

---

## 4. 레지스트리에 올리고 받기

빌드한 이미지는 내 컴퓨터에만 있습니다. 서버에서 쓰려면 **레지스트리에 push하고 서버에서 pull**합니다.

### 주요 레지스트리

| 레지스트리 | 주소 | 특징 |
|---|---|---|
| Docker Hub | `docker.io` | 기본값. 공개 이미지가 가장 많음. 무료 계정은 pull 횟수 제한 있음 |
| GitHub Container Registry | `ghcr.io` | GitHub 계정과 권한 연동. GitHub Actions와 궁합이 좋음 |
| AWS ECR | `<계정>.dkr.ecr.<리전>.amazonaws.com` | AWS 서비스(ECS, EKS)와 연동 |
| Google Artifact Registry | `<리전>-docker.pkg.dev` | GCP(Cloud Run, GKE)와 연동 |
| Harbor | 직접 설치 | 사내 자체 구축용 오픈소스 |

### 이미지 이름의 구조

```
ghcr.io / kimgeuneon / gelog-api : 0.1.0
───┬───   ────┬────   ────┬────   ──┬──
레지스트리   네임스페이스    저장소      태그
```

레지스트리 주소를 생략하면 Docker Hub(`docker.io`)로 간주합니다. `nginx:alpine`은 사실 `docker.io/library/nginx:alpine`입니다.

### push와 pull (GHCR 예시)

```bash
# 1) 로그인 (write:packages 권한이 있는 GitHub 토큰)
#    토큰을 명령어에 직접 쓰면 셸 히스토리에 남으니 stdin으로 넘기기
echo "$GHCR_TOKEN" | docker login ghcr.io -u kimgeuneon --password-stdin

# 2) 레지스트리 주소가 포함된 이름으로 태그 붙이기
docker tag gelog-api:0.1.0 ghcr.io/kimgeuneon/gelog-api:0.1.0

# 3) 올리기
docker push ghcr.io/kimgeuneon/gelog-api:0.1.0

# 4) 서버에서 받기
docker pull ghcr.io/kimgeuneon/gelog-api:0.1.0
```

같은 이미지를 다른 레지스트리로 옮기고 싶으면 태그만 새로 붙여서 push하면 됩니다. 레이어가 같으니 업로드도 빠릅니다.

```bash
docker pull ghcr.io/kimgeuneon/gelog-api:0.1.0
docker tag  ghcr.io/kimgeuneon/gelog-api:0.1.0 docker.io/kimgeuneon/gelog-api:0.1.0
docker push docker.io/kimgeuneon/gelog-api:0.1.0
```

### 태그 전략

- **`latest`는 운영 환경에서 쓰지 마세요.** 이름과 달리 "가장 최신"을 보장하지 않습니다. 그냥 태그를 지정하지 않았을 때 붙는 기본값일 뿐이고, 어떤 버전이 돌고 있는지 알 수 없게 됩니다.
- **버전(`0.1.0`)이나 git 커밋 해시(`a1b2c3d`)** 를 태그로 쓰세요. 문제가 생기면 이전 태그로 바로 되돌릴 수 있습니다.
- 태그는 덮어쓸 수 있습니다. 완전히 고정하려면 **다이제스트**로 지정합니다.
  ```
  ghcr.io/kimgeuneon/gelog-api@sha256:4f3c...
  ```

---

## 5. Docker Compose: 여러 컨테이너를 한 번에

API 서버와 DB처럼 컨테이너가 여러 개면 `docker run`을 일일이 치기 힘듭니다. Compose는 이를 YAML 파일 하나로 정의합니다.

```yaml
# compose.yaml
services:
  api:
    image: ghcr.io/kimgeuneon/gelog-api:0.1.0
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgres://gelog:${DB_PASSWORD}@db:5432/gelog
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:17
    environment:
      POSTGRES_USER: gelog
      POSTGRES_PASSWORD: ${DB_PASSWORD}   # .env 파일에서 읽음
      POSTGRES_DB: gelog
    volumes:
      - db-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  db-data:
```

```bash
docker compose up -d      # 전부 실행
docker compose logs -f api
docker compose pull && docker compose up -d   # 새 이미지로 업데이트
docker compose down       # 전부 중지 (볼륨은 유지)
```

같은 Compose 파일 안의 서비스끼리는 **서비스 이름이 곧 호스트 이름**입니다. 그래서 `api`에서 `db:5432`로 접속할 수 있습니다.

---

## 6. 서버에서의 Docker: 장점과 한계

Docker(+ Compose)만으로 서버를 운영하면 이렇게 됩니다.

**배포 흐름**
```
코드 push → CI에서 이미지 빌드 → 레지스트리에 push
→ 서버에 SSH 접속 → docker compose pull → docker compose up -d
```

**장점**
- 구조가 단순합니다. 서버 한 대, YAML 파일 하나면 끝입니다.
- 서버에 Python이나 Node 버전을 맞출 필요가 없습니다. Docker만 있으면 됩니다.
- 개인 프로젝트나 소규모 서비스에는 이 정도로 충분한 경우가 대부분입니다.

**한계**
- **서버 한 대에 묶여 있습니다.** 서버가 죽으면 서비스도 같이 죽습니다.
- **배포할 때 잠깐 끊깁니다.** 기존 컨테이너를 내리고 새 컨테이너를 올리는 사이에 요청이 실패할 수 있습니다.
- **트래픽에 따라 자동으로 늘거나 줄지 않습니다.**
- `--restart`는 프로세스가 죽었을 때 다시 띄워 줄 뿐, "응답은 하는데 고장 난 상태"는 감지하지 못합니다.
- 서버가 여러 대가 되면 어느 서버에 어떤 컨테이너를 띄울지 사람이 직접 관리해야 합니다.

이 한계를 해결하려고 등장한 것이 **컨테이너 오케스트레이션**이고, 사실상의 표준이 Kubernetes입니다.

---

## 7. Kubernetes

Kubernetes(줄여서 K8s)는 **여러 대의 서버(노드)를 하나의 클러스터로 묶고, 그 위에서 컨테이너를 자동으로 배치, 복구, 확장**하는 플랫폼입니다.

### 핵심 아이디어: 선언형과 조정 루프

Docker는 **명령형**입니다. "이 컨테이너를 실행해", "저걸 멈춰"라고 하나씩 지시합니다.

Kubernetes는 **선언형**입니다. "이 이미지로 된 Pod가 항상 3개 떠 있어야 해"라고 **원하는 상태**를 선언하면, Kubernetes가 현재 상태를 계속 지켜보다가 차이가 생길 때마다 맞춰 줍니다(reconciliation loop).

- Pod 하나가 죽으면 → 자동으로 새로 띄움
- 노드 하나가 죽으면 → 그 노드의 Pod를 다른 노드로 옮김
- 이미지 태그를 바꾸면 → 하나씩 교체하며 무중단 배포

### 구조

```
┌──────────── Control Plane (클러스터의 두뇌) ────────────┐
│ kube-apiserver   모든 요청의 입구 (kubectl이 여기로)       │
│ etcd             클러스터 상태를 저장하는 키-값 DB          │
│ scheduler        새 Pod를 어느 노드에 둘지 결정             │
│ controller-mgr   원하는 상태와 현재 상태를 맞추는 컨트롤러들   │
└──────────────────────────────────────────────────────────┘
          │                    │                    │
   ┌── Node 1 ──┐       ┌── Node 2 ──┐       ┌── Node 3 ──┐
   │ kubelet    │       │ kubelet    │       │ kubelet    │
   │ kube-proxy │       │ kube-proxy │       │ kube-proxy │
   │ containerd │       │ containerd │       │ containerd │
   │ [Pod][Pod] │       │ [Pod]      │       │ [Pod][Pod] │
   └────────────┘       └────────────┘       └────────────┘
```

> **Kubernetes는 Docker 엔진을 쓰지 않습니다.** 1.24 버전에서 Docker 연동 계층(dockershim)이 제거됐고, 지금은 containerd나 CRI-O를 직접 씁니다. 하지만 이미지는 OCI 표준이라서 **Docker로 빌드한 이미지는 그대로 동작합니다.** "Docker로 만들고, Kubernetes로 운영한다"는 말이 여전히 맞습니다.

### 주요 오브젝트

| 오브젝트 | 역할 |
|---|---|
| **Pod** | 배포의 최소 단위. 컨테이너 1개(또는 밀접한 몇 개)를 감쌈. 언제든 죽고 다시 생길 수 있는 일회용 |
| **Deployment** | "이 Pod를 N개 유지해" 선언. 롤링 업데이트와 롤백 담당 |
| **Service** | 계속 바뀌는 Pod들 앞에 고정 주소와 로드밸런싱 제공 (ClusterIP, NodePort, LoadBalancer) |
| **Ingress / Gateway API** | 도메인, 경로 기반으로 외부 HTTP 트래픽을 Service로 라우팅 |
| **ConfigMap / Secret** | 설정값과 비밀값을 이미지와 분리해서 주입 |
| **PersistentVolumeClaim** | Pod가 바뀌어도 유지되는 저장 공간 요청 |
| **Namespace** | 클러스터 안의 논리적 구역 (dev, prod, 팀별 분리) |
| **HorizontalPodAutoscaler** | CPU나 메모리 사용량에 따라 Pod 개수 자동 조절 |

### 매니페스트 예시: FastAPI 배포

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gelog-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gelog-api
  template:
    metadata:
      labels:
        app: gelog-api
    spec:
      imagePullSecrets:
        - name: ghcr-secret          # 비공개 레지스트리 인증
      containers:
        - name: api
          image: ghcr.io/kimgeuneon/gelog-api:0.1.0
          ports:
            - containerPort: 8000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: gelog-secrets
                  key: database-url
          resources:
            requests: { cpu: 100m, memory: 128Mi }   # 스케줄링 기준
            limits:   { cpu: 500m, memory: 512Mi }   # 상한
          readinessProbe:            # 트래픽 받을 준비가 됐는지
            httpGet: { path: /health, port: 8000 }
          livenessProbe:             # 살아 있는지 (실패하면 재시작)
            httpGet: { path: /health, port: 8000 }
            initialDelaySeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: gelog-api
spec:
  selector:
    app: gelog-api
  ports:
    - port: 80
      targetPort: 8000
```

`readinessProbe`와 `livenessProbe` 덕분에 Docker의 `--restart`가 못 하던 일, 즉 **"프로세스는 살아 있지만 응답하지 못하는 상태"를 감지해서 트래픽에서 빼거나 재시작**할 수 있습니다.

### 비공개 레지스트리에서 이미지 받기

Kubernetes 노드도 이미지를 pull해야 하므로, 비공개 이미지라면 인증 정보를 Secret으로 등록합니다.

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=kimgeuneon \
  --docker-password="$GHCR_TOKEN"
```

그리고 위 예시처럼 `imagePullSecrets`에 이름을 지정합니다. AWS EKS + ECR, GKE + Artifact Registry 조합은 클라우드 IAM 권한으로 연동되어서 이 과정이 필요 없는 경우가 많습니다.

### kubectl 기본 명령어

```bash
kubectl apply -f deployment.yaml        # 선언한 상태 적용
kubectl get pods                        # Pod 목록
kubectl describe pod <이름>             # 상세 정보, 이벤트 (에러 원인 찾을 때)
kubectl logs -f deploy/gelog-api        # 로그
kubectl exec -it <pod> -- sh            # Pod 안으로 들어가기

# 새 버전 배포 (롤링 업데이트)
kubectl set image deploy/gelog-api api=ghcr.io/kimgeuneon/gelog-api:0.2.0
kubectl rollout status deploy/gelog-api
kubectl rollout undo deploy/gelog-api   # 문제 생기면 이전 버전으로

kubectl scale deploy/gelog-api --replicas=5
```

자주 보는 에러도 알아 두면 좋습니다.
- **`ImagePullBackOff`**: 이미지를 못 받음. 이미지 이름, 태그 오타 또는 레지스트리 인증 문제
- **`CrashLoopBackOff`**: 컨테이너가 시작하자마자 계속 죽음. `kubectl logs --previous`로 직전 로그 확인
- **`Pending`**: 배치할 노드가 없음. 리소스 부족이나 조건 불일치. `describe`로 이벤트 확인

### 어디서 돌리나?

- **로컬 학습용**: kind, minikube, Docker Desktop 내장 Kubernetes
- **가벼운 자체 구축**: k3s (라즈베리파이나 소형 VPS에도 올라감)
- **매니지드 서비스**: AWS EKS, Google GKE, Azure AKS. Control Plane 운영을 클라우드가 대신 해 줌

---

## 8. Docker vs Kubernetes 정리

| | Docker (+ Compose) | Kubernetes |
|---|---|---|
| 역할 | 컨테이너 빌드, 실행 | 컨테이너 오케스트레이션 |
| 범위 | 서버 1대 | 서버 여러 대(클러스터) |
| 방식 | 명령형 (`run`, `stop`) | 선언형 (원하는 상태를 YAML로) |
| 장애 복구 | 프로세스가 죽으면 재시작 정도 | Pod, 노드 장애 자동 복구 + 헬스 체크 |
| 배포 | 잠깐 끊김 | 롤링 업데이트로 무중단, 롤백 |
| 확장 | 수동 | `replicas` 조절, HPA로 자동 확장 |
| 서비스 디스커버리 | Compose 네트워크 안에서 서비스 이름 | 클러스터 DNS (`gelog-api.default.svc.cluster.local`) |
| 설정, 비밀값 | `.env`, 환경 변수 | ConfigMap, Secret |
| 학습 곡선 | 낮음 | 높음 |
| 운영 부담 | 낮음 | 높음 (매니지드를 써도 상당함) |

## 9. 그래서 뭘 써야 할까?

- **개인 블로그 백엔드, 사이드 프로젝트, 트래픽이 크지 않은 서비스** → **Docker Compose + VPS 한 대**면 충분합니다. Kubernetes는 오버엔지니어링입니다.
- **무중단 배포, 자동 복구, 트래픽 변동 대응이 필요하고 서비스가 여러 개** → Kubernetes를 고려할 때입니다.
- **컨테이너는 쓰고 싶지만 인프라 관리는 싫다** → Cloud Run, AWS App Runner, Fly.io 같은 서버리스 컨테이너 플랫폼도 좋은 선택입니다. 이미지만 레지스트리에 올리면 확장과 HTTPS를 알아서 처리해 줍니다.

어떤 길을 가든 출발점은 같습니다. **좋은 Dockerfile을 쓰고, 태그를 잘 붙여서, 레지스트리에 올리는 것.** 그 이미지는 Compose에서도, Kubernetes에서도, 서버리스 플랫폼에서도 그대로 돌아갑니다.
