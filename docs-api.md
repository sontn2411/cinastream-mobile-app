# Tài liệu API KKPhim (PhimAPI) 🎬

Hệ thống API RESTful cung cấp dữ liệu phim ảnh phong phú, cập nhật liên tục với thông tin về phim, tập phim, link stream video, diễn viên, thể loại, quốc gia,...

---

## 📌 Tổng quan (Overview)

- **Base URL:** `https://phimapi.com`
- **CDN Hình ảnh mặc định:** `https://phimimg.com`
- **Định dạng dữ liệu:** `application/json`
- **Mã hóa:** `UTF-8`
- **Phương thức chính:** `GET`
- **Xác thực (Authentication):** Không yêu cầu API Key / Bearer Token (Public API).

---

## 1. Phim mới cập nhật

Lấy danh sách các bộ phim vừa được cập nhật tập mới hoặc phim mới trên hệ thống.

- **URL:** `/danh-sach/phim-moi-cap-nhat`
  *(Hoặc phiên bản V3: `/danh-sach/phim-moi-cap-nhat-v3`)*
- **Method:** `GET`
- **Tham số Query:**
  - `page` *(number, tùy chọn)*: Số trang cần lấy (Mặc định: `1`).

**Ví dụ Request:**

```http
GET https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1
```

**JSON Phản hồi (Response):**

```json
{
  "status": true,
  "msg": "done",
  "items": [
    {
      "_id": "6a5f428eb8deaef39f019778",
      "name": "Vạn Cổ Thần Đế",
      "slug": "van-co-than-de",
      "origin_name": "God Of Eternity",
      "poster_url": "https://phimimg.com/uploads/movies/20260721/van-co-than-de-poster.webp",
      "thumb_url": "https://phimimg.com/uploads/movies/20260721/van-co-than-de-thumb.webp",
      "year": 2026,
      "modified": {
        "time": "2026-10-27T11:46:51.000Z"
      },
      "tmdb": {
        "id": "329260",
        "type": "tv",
        "season": 1,
        "vote_average": 0,
        "vote_count": 0
      },
      "imdb": {
        "id": null,
        "vote_average": 0,
        "vote_count": 0
      }
    }
  ],
  "pagination": {
    "totalItems": 30431,
    "totalItemsPerPage": 24,
    "currentPage": 1,
    "totalPages": 1268
  }
}
```

> **Lưu ý:** Ở endpoint này, trường `thumb_url` và `poster_url` đã là **URL tuyệt đối** chứa sẵn domain CDN `https://phimimg.com`.

---

## 2. Danh sách phim theo phân loại

Lấy danh sách phim theo định dạng: Phim lẻ, Phim bộ, Hoạt hình, TV Shows.

- **URL:** `/v1/api/danh-sach/{loai_phim}`
- **Method:** `GET`
- **Tham số Path:**
  - `{loai_phim}`: `phim-le`, `phim-bo`, `hoat-hinh`, `tv-shows`.
- **Tham số Query (tùy chọn):**
  - `page`: Số trang (Mặc định: `1`).
  - `sort_field`: Trường sắp xếp (`modified.time`, `_id`, `year`). Mặc định: `modified.time`.
  - `sort_type`: Kiểu sắp xếp (`desc`, `asc`). Mặc định: `desc`.
  - `category`: Lọc theo slug thể loại (Ví dụ: `hanh-dong`).
  - `country`: Lọc theo slug quốc gia (Ví dụ: `han-quoc`).
  - `year`: Lọc theo năm phát hành (Ví dụ: `2024`).

**Ví dụ Request:**

```http
GET https://phimapi.com/v1/api/danh-sach/phim-le?page=1
```

**JSON Phản hồi (Response):**

```json
{
  "status": true,
  "msg": "done",
  "data": {
    "seoOnPage": {
      "og_type": "website",
      "titleHead": "Phim Lẻ | Phim Lẻ hay tuyển chọn",
      "descriptionHead": "Danh sách phim lẻ...",
      "og_image": ["uploads/movies/..."],
      "og_url": "danh-sach/phim-le"
    },
    "breadCrumb": [
      { "name": "Phim Lẻ", "slug": "/danh-sach/phim-le", "isCurrent": false, "position": 2 }
    ],
    "titlePage": "Phim Lẻ",
    "items": [
      {
        "_id": "e08b3d160859cd6c87fc6794be459549",
        "name": "Bàn Ăn Của Noriko",
        "slug": "ban-an-cua-noriko",
        "origin_name": "Noriko's Dinner Table",
        "type": "single",
        "thumb_url": "uploads/movies/20261027/ban-an-cua-noriko-thumb.webp",
        "poster_url": "uploads/movies/20261027/ban-an-cua-noriko-poster.webp",
        "sub_docquyen": false,
        "chieurap": false,
        "time": "159 phút",
        "episode_current": "Full",
        "quality": "FHD",
        "lang": "Vietsub",
        "year": 2005,
        "category": [
          { "id": "37a7b38b6184a5ebd3c43015aa20709d", "name": "Chính Kịch", "slug": "chinh-kich" }
        ],
        "country": [
          { "id": "d4097fbffa8f7149a61281437171eb83", "name": "Nhật Bản", "slug": "nhat-ban" }
        ],
        "modified": {
          "time": "2026-10-27T11:01:19.000Z"
        }
      }
    ],
    "params": {
      "type_slug": "danh-sach",
      "slug": "phim-le",
      "sortField": "modified.time",
      "sortType": "desc",
      "pagination": {
        "totalItems": 17202,
        "totalItemsPerPage": 24,
        "currentPage": 1,
        "totalPages": 717
      }
    },
    "type_list": "phim-le",
    "APP_DOMAIN_FRONTEND": "https://kkphim2.com",
    "APP_DOMAIN_CDN_IMAGE": "https://phimimg.com"
  }
}
```

> **Lưu ý xử lý ảnh:** Ở API V1, `thumb_url` và `poster_url` là **đường dẫn tương đối**. Cần ghép với `APP_DOMAIN_CDN_IMAGE` (`https://phimimg.com/` + `thumb_url`).

---

## 3. Chi tiết phim & Link phát (Streaming)

Lấy đầy đủ thông tin chi tiết của phim cùng danh sách server, các tập và đường dẫn stream (`m3u8`, `embed`).

- **URL:** `/phim/{slug}`
- **Method:** `GET`
- **Tham số Path:**
  - `{slug}` *(bắt buộc)*: Slug của bộ phim (Ví dụ: `huyen-thoai-bach-long`).

**Ví dụ Request:**

```http
GET https://phimapi.com/phim/huyen-thoai-bach-long
```

**JSON Phản hồi (Response):**

```json
{
  "status": true,
  "msg": "",
  "movie": {
    "_id": "c53efcafc718f55506b5ea6ffc93f50b",
    "name": "Huyền Thoại Bạch Long",
    "slug": "huyen-thoai-bach-long",
    "origin_name": "Legend Of The White Dragon",
    "content": "<p>Buộc phải ẩn mình trong bóng tối, người anh hùng...</p>",
    "type": "single",
    "status": "completed",
    "thumb_url": "https://phimimg.com/uploads/movies/20261027/huyen-thoai-bach-long-thumb.webp",
    "poster_url": "https://phimimg.com/uploads/movies/20261027/huyen-thoai-bach-long-poster.webp",
    "trailer_url": "https://www.youtube.com/watch?v=...",
    "time": "97 phút",
    "episode_current": "Full",
    "episode_total": 1,
    "quality": "FHD",
    "lang": "Vietsub",
    "year": 2026,
    "view": 14,
    "actor": ["Jason David Frank", "Aaron Schoenke"],
    "director": ["Aaron Schoenke"],
    "category": [
      { "id": "9822be111d2ccc29c7172c78b8af8ff5", "name": "Hành Động", "slug": "hanh-dong" }
    ],
    "country": [
      { "id": "74d9fa92f4dea9ecea8fc2233dc7921a", "name": "Âu Mỹ", "slug": "au-my" }
    ]
  },
  "episodes": [
    {
      "server_name": "Vietsub",
      "server_data": [
        {
          "name": "Full",
          "slug": "full",
          "filename": "Huyen-Thoai-Bach-Long-Full.mp4",
          "link_embed": "https://player.phimapi.com/player/?url=https://a.kvp726.com/20261026/yrFNabNr/index.m3u8",
          "link_m3u8": "https://a.kvp726.com/20261026/yrFNabNr/index.m3u8"
        }
      ]
    }
  ]
}
```

> **Lưu ý quan trọng cho Frontend:**
> 1. `movie.content`: Là **chuỗi HTML** (chứa thẻ `<p>`, `<b>`...). Khi hiển thị cần render dạng HTML an toàn (ví dụ: `dangerouslySetInnerHTML` trong React/Next.js) và nên khử độc hại (sanitize) bằng DOMPurify.
> 2. `link_embed`: Dùng nhúng trực tiếp bằng thẻ `<iframe>`.
> 3. `link_m3u8`: Luồng HLS stream trực tiếp. Trên desktop (Chrome/Firefox/Edge) không hỗ trợ native HLS, cần dùng thư viện player như `hls.js`, `video.js` hoặc `@vidstack/react`.

---

## 4. Thể loại (Category)

### 4.1 Danh sách tất cả thể loại

Lấy danh mục tất cả thể loại phim hiện có trên hệ thống.

- **URL:** `/the-loai`
- **Method:** `GET`

**JSON Phản hồi (Response):**

```json
{
  "status": "success",
  "message": "",
  "data": {
    "items": [
      { "_id": "9822be111d2ccc29c7172c78b8af8ff5", "name": "Hành Động", "slug": "hanh-dong" },
      { "_id": "37a7b38b6184a5ebd3c43015aa20709d", "name": "Chính Kịch", "slug": "chinh-kich" },
      { "_id": "ba6fd52e5a3aca80eaaf1a3b50a182db", "name": "Hài Hước", "slug": "hai-huoc" },
      { "_id": "bb2b4b030608ca5984c8dd0770f5b40b", "name": "Tình Cảm", "slug": "tinh-cam" }
    ]
  }
}
```

### 4.2 Lấy phim theo thể loại cụ thể

- **URL:** `/v1/api/the-loai/{slug_the_loai}`
- **Method:** `GET`
- **Tham số Path:** `{slug_the_loai}` (Ví dụ: `hanh-dong`, `tinh-cam`)
- **Tham số Query:** `page` *(Mặc định: 1)*, `sort_field`, `sort_type`

**Ví dụ Request:**

```http
GET https://phimapi.com/v1/api/the-loai/hanh-dong?page=1
```

*(Cấu trúc dữ liệu phản hồi tương tự endpoint `/v1/api/danh-sach/{loai_phim}`)*

---

## 5. Quốc gia (Country)

### 5.1 Danh sách tất cả quốc gia

Lấy danh mục tất cả quốc gia hiện có trên hệ thống.

- **URL:** `/quoc-gia`
- **Method:** `GET`

**JSON Phản hồi (Response):**

```json
{
  "status": "success",
  "message": "",
  "data": {
    "items": [
      { "_id": "74d9fa92f4dea9ecea8fc2233dc7921a", "name": "Âu Mỹ", "slug": "au-my" },
      { "_id": "05de95be5fc404da9680bbb3dd8262e6", "name": "Hàn Quốc", "slug": "han-quoc" },
      { "_id": "3e075636c731fe0f889c69e0bf82c083", "name": "Trung Quốc", "slug": "trung-quoc" },
      { "_id": "d4097fbffa8f7149a61281437171eb83", "name": "Nhật Bản", "slug": "nhat-ban" },
      { "_id": "f6ce1ae8b39af9d38d653b8a0890adb8", "name": "Việt Nam", "slug": "viet-nam" }
    ]
  }
}
```

### 5.2 Lấy phim theo quốc gia cụ thể

- **URL:** `/v1/api/quoc-gia/{slug_quoc_gia}`
- **Method:** `GET`
- **Tham số Path:** `{slug_quoc_gia}` (Ví dụ: `han-quoc`, `au-my`, `viet-nam`)
- **Tham số Query:** `page` *(Mặc định: 1)*, `sort_field`, `sort_type`

**Ví dụ Request:**

```http
GET https://phimapi.com/v1/api/quoc-gia/han-quoc?page=1
```

*(Cấu trúc dữ liệu phản hồi tương tự endpoint `/v1/api/danh-sach/{loai_phim}`)*

---

## 6. Năm phát hành (Release Year)

Lấy danh sách phim theo năm sản xuất.

- **URL:** `/v1/api/nam/{year}`
- **Method:** `GET`
- **Tham số Path:** `{year}` (Ví dụ: `2024`, `2023`, `2022`...)
- **Tham số Query:** `page` *(Mặc định: 1)*, `sort_field`, `sort_type`

**Ví dụ Request:**

```http
GET https://phimapi.com/v1/api/nam/2024?page=1
```

*(Cấu trúc dữ liệu phản hồi tương tự endpoint `/v1/api/danh-sach/{loai_phim}`)*

---

## 7. Tìm kiếm phim (Search)

Tìm kiếm phim theo từ khóa (tên tiếng Việt hoặc tên gốc).

- **URL:** `/v1/api/tim-kiem`
- **Method:** `GET`
- **Tham số Query (Bắt buộc):**
  - `keyword`: Từ khóa tìm kiếm (Lưu ý: nên dùng `encodeURIComponent()` khi gọi API).
- **Tham số Query (Tùy chọn):**
  - `page`: Trang cần xem (Mặc định: `1`).
  - `limit`: Số lượng kết quả mỗi trang (Mặc định: `10` hoặc `20`).

**Ví dụ Request:**

```http
GET https://phimapi.com/v1/api/tim-kiem?keyword=avatar&page=1&limit=10
```

**JSON Phản hồi (Response):**

```json
{
  "status": "success",
  "message": "",
  "data": {
    "titlePage": "Tìm kiếm từ khóa: avatar",
    "items": [
      {
        "_id": "9d42d7587d22e1d36d009e89d4a2de98",
        "name": "Avatar: Dòng Chảy Của Nước",
        "slug": "avatar-dong-chay-cua-nuoc",
        "origin_name": "Avatar: The Way Of Water",
        "type": "single",
        "thumb_url": "https://phimimg.com/upload/vod/20250513-1/7b4e51db1a258ef9602558352066bfec.jpg",
        "poster_url": "https://phimimg.com/upload/vod/20250513-1/59fc5ffe0025ca40c99d48b070b59320.jpg",
        "year": 2022,
        "quality": "FHD",
        "lang": "Vietsub + Thuyết Minh",
        "category": [
          { "id": "9822be111d2ccc29c7172c78b8af8ff5", "name": "Hành Động", "slug": "hanh-dong" }
        ],
        "country": [
          { "id": "74d9fa92f4dea9ecea8fc2233dc7921a", "name": "Âu Mỹ", "slug": "au-my" }
        ]
      }
    ],
    "params": {
      "keyword": "avatar",
      "pagination": {
        "totalItems": 15,
        "totalItemsPerPage": 10,
        "currentPage": 1,
        "totalPages": 2
      }
    },
    "APP_DOMAIN_CDN_IMAGE": "https://phimimg.com"
  }
}
```

---

## 8. Hướng dẫn tích hợp cho Frontend / Next.js 💡

### 8.1 Hàm xử lý URL hình ảnh (Image Helper)

Do ảnh có thể trả về dưới dạng đường dẫn tương đối hoặc tuyệt đối tùy endpoint:

```typescript
export const getImageSrc = (url?: string): string => {
  if (!url) return '/placeholder-poster.png';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  return `https://phimimg.com/${cleanUrl}`;
};
```

### 8.2 Phát Video (Video Streaming)

1. **Dùng Iframe (`link_embed`):**
   Đơn giản và tương thích 100% không cần cài thêm thư viện player:
   ```tsx
   <iframe
     src={currentEpisode.link_embed}
     className="w-full h-full"
     allowFullScreen
     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
   />
   ```
2. **Dùng Custom Player với HLS (`link_m3u8`):**
   Nếu muốn tự làm giao diện trình phát phim (custom UI controls), tích hợp thư viện `hls.js` hoặc `@vidstack/react` để đọc luồng `.m3u8`.

### 8.3 Caching trong Next.js App Router

Khi gọi API từ Server Component:

```typescript
// Danh sách phim mới: revalidate sau 10 phút
export async function getNewMovies(page = 1) {
  const res = await fetch(`https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${page}`, {
    next: { revalidate: 600 },
  });
  return res.json();
}

// Chi tiết phim: revalidate sau 1 giờ
export async function getMovieDetail(slug: string) {
  const res = await fetch(`https://phimapi.com/phim/${slug}`, {
    next: { revalidate: 3600 },
  });
  return res.json();
}

// Tìm kiếm: không lưu cache (luôn fetch mới)
export async function searchMovies(keyword: string, page = 1) {
  const res = await fetch(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`, {
    cache: 'no-store',
  });
  return res.json();
}
```
