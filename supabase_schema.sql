-- シャトルボード Supabase スキーマ
-- Supabase の SQL Editor で実行してください

-- tournaments（大会）
create table tournaments (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  date_range    text,
  venue         text,
  status        text default '準備中',
  public_url    text unique,
  logo_url      text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz default now()
);

-- categories（種目）
create table categories (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid references tournaments(id) on delete cascade,
  type            text not null,
  name            text not null,
  code            text,
  format          text,
  sort_order      int default 0
);

-- blocks（ブロック）
create table blocks (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid references categories(id) on delete cascade,
  name          text not null,
  block_type    text default 'league',
  venue_area    text,
  created_at    timestamptz default now()
);

-- entries（エントリー・個人戦）
create table entries (
  id          uuid primary key default gen_random_uuid(),
  block_id    uuid references blocks(id) on delete cascade,
  name        text not null,
  player2     text,
  club        text,
  seed        int,
  sort_order  int default 0
);

-- matches（個人戦の試合）
create table matches (
  id          uuid primary key default gen_random_uuid(),
  block_id    uuid references blocks(id) on delete cascade,
  entry1_id   uuid references entries(id),
  entry2_id   uuid references entries(id),
  score1      int,
  score2      int,
  winner_id   uuid references entries(id),
  court       text,
  round       int default 1,
  match_order int,
  status      text default '未試合',
  played_at   timestamptz,
  created_at  timestamptz default now()
);

-- teams（団体戦チーム）
create table teams (
  id          uuid primary key default gen_random_uuid(),
  block_id    uuid references blocks(id) on delete cascade,
  name        text not null,
  club        text,
  sort_order  int default 0
);

-- ties（団体戦の対決）
create table ties (
  id              uuid primary key default gen_random_uuid(),
  block_id        uuid references blocks(id) on delete cascade,
  team1_id        uuid references teams(id),
  team2_id        uuid references teams(id),
  winner_team_id  uuid references teams(id),
  team1_rubbers   int default 0,
  team2_rubbers   int default 0,
  status          text default '未試合',
  match_order     int
);

-- rubbers（団体戦の各種目）
create table rubbers (
  id              uuid primary key default gen_random_uuid(),
  tie_id          uuid references ties(id) on delete cascade,
  rubber_no       int not null,
  rubber_type     text not null,
  label           text not null,
  team1_p1        text,
  team1_p2        text,
  team2_p1        text,
  team2_p2        text,
  score1          int,
  score2          int,
  winner_team_id  uuid references teams(id),
  court           text,
  status          text default '未試合',
  played_at       timestamptz
);

-- ========================================
-- Row Level Security (RLS)
-- ========================================

alter table tournaments enable row level security;
alter table categories enable row level security;
alter table blocks enable row level security;
alter table entries enable row level security;
alter table matches enable row level security;
alter table teams enable row level security;
alter table ties enable row level security;
alter table rubbers enable row level security;

-- 速報ページ: 誰でも読み取り可能
create policy "public read tournaments" on tournaments for select using (true);
create policy "public read categories" on categories for select using (true);
create policy "public read blocks" on blocks for select using (true);
create policy "public read entries" on entries for select using (true);
create policy "public read matches" on matches for select using (true);
create policy "public read teams" on teams for select using (true);
create policy "public read ties" on ties for select using (true);
create policy "public read rubbers" on rubbers for select using (true);

-- 管理操作: 認証済みユーザーのみ
create policy "auth insert tournaments" on tournaments for insert with check (auth.uid() is not null);
create policy "auth update tournaments" on tournaments for update using (auth.uid() is not null);
create policy "auth delete tournaments" on tournaments for delete using (auth.uid() is not null);

create policy "auth insert categories" on categories for insert with check (auth.uid() is not null);
create policy "auth update categories" on categories for update using (auth.uid() is not null);
create policy "auth delete categories" on categories for delete using (auth.uid() is not null);

create policy "auth insert blocks" on blocks for insert with check (auth.uid() is not null);
create policy "auth update blocks" on blocks for update using (auth.uid() is not null);
create policy "auth delete blocks" on blocks for delete using (auth.uid() is not null);

create policy "auth insert entries" on entries for insert with check (auth.uid() is not null);
create policy "auth update entries" on entries for update using (auth.uid() is not null);
create policy "auth delete entries" on entries for delete using (auth.uid() is not null);

create policy "auth insert matches" on matches for insert with check (auth.uid() is not null);
create policy "auth update matches" on matches for update using (auth.uid() is not null);
create policy "auth delete matches" on matches for delete using (auth.uid() is not null);

create policy "auth insert teams" on teams for insert with check (auth.uid() is not null);
create policy "auth update teams" on teams for update using (auth.uid() is not null);
create policy "auth delete teams" on teams for delete using (auth.uid() is not null);

create policy "auth insert ties" on ties for insert with check (auth.uid() is not null);
create policy "auth update ties" on ties for update using (auth.uid() is not null);
create policy "auth delete ties" on ties for delete using (auth.uid() is not null);

create policy "auth insert rubbers" on rubbers for insert with check (auth.uid() is not null);
create policy "auth update rubbers" on rubbers for update using (auth.uid() is not null);
create policy "auth delete rubbers" on rubbers for delete using (auth.uid() is not null);

-- Realtime を有効化
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table rubbers;
alter publication supabase_realtime add table ties;
