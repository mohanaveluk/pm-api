use survey;
/*
drop table if exists user_login_history;
drop table if exists votes;
drop table if exists temp_votes;
drop table if exists user_login_history;
drop table if exists refresh_token_tbl;
drop table if exists password_reset_tokens;
drop table if exists password_archive_tbl;
drop table if exists otc_tbl;
drop table if exists contact_tbl;
drop table if exists log_tbl;
drop table if exists survey_parties;
drop table if exists party;
drop table if exists surveys;
drop table if exists user;
*/

CREATE TABLE `contact_tbl` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` text NOT NULL,
  `last_name` text NOT NULL,
  `email` varchar(255) NOT NULL,
  `mobile` varchar(255) DEFAULT NULL,
  `message` text NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `log_tbl` (
  `id` int NOT NULL AUTO_INCREMENT,
  `level` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `context` text,
  `timestamp` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE if not exists `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` varchar(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `mobile` varchar(255) DEFAULT NULL,
  `major` varchar(255) DEFAULT NULL,
  `is_email_verified` tinyint NOT NULL DEFAULT '0',
  `verification_code` varchar(255) DEFAULT NULL,
  `verification_code_expiry` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_active` int NOT NULL DEFAULT '1',
  `uguid` varchar(255) NOT NULL,
  `role_id` int DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `is_deleted` tinyint NOT NULL DEFAULT '0',
  `last_login` datetime DEFAULT NULL,
  `address_line1` varchar(255) DEFAULT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_2b565172be4fb01f116aabffd7` (`uguid`),
  UNIQUE KEY `IDX_e12875dfb3b1d92d7d7c5377e2` (`email`),
  KEY `FK_fb2e442d14add3cefbdf33c4561` (`role_id`),
  CONSTRAINT `FK_fb2e442d14add3cefbdf33c4561` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_login_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` varchar(255) NOT NULL,
  `loginTime` timestamp NOT NULL,
  `logoutTime` timestamp NULL DEFAULT NULL,
  `ipAddress` varchar(50) NOT NULL,
  `userAgent` varchar(255) DEFAULT NULL,
  `deviceType` enum('desktop','mobile','tablet') NOT NULL DEFAULT 'desktop',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `userId` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_8cd045e34dacf6e82ac34e783b5` (`userId`),
  CONSTRAINT `FK_8cd045e34dacf6e82ac34e783b5` FOREIGN KEY (`userId`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `otc_tbl` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uguid` varchar(255) DEFAULT NULL,
  `mobile` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `is_active` int NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expiry_datetime` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `password_archive_tbl` (
  `id` int NOT NULL AUTO_INCREMENT,
  `password` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `user_id` int NOT NULL,
  `userId` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_1f647e94f0ec9a96514824387ef` (`userId`),
  CONSTRAINT `FK_1f647e94f0ec9a96514824387ef` FOREIGN KEY (`userId`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `refresh_token_tbl` (
  `id` varchar(36) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expiresAt` datetime NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `isRevoked` tinyint NOT NULL DEFAULT '0',
  `userId` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_84f9aa7fc0af0f2b77c3b5aa8ba` (`userId`),
  CONSTRAINT `FK_84f9aa7fc0af0f2b77c3b5aa8ba` FOREIGN KEY (`userId`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `country` (
  `id` varchar(255) NOT NULL,
  `name` varchar(120) NOT NULL,
  `iso_code` varchar(5) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);


CREATE TABLE `party_master` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(255) DEFAULT '#000000',
  `leader_name` varchar(100) DEFAULT NULL,
  `contestant_name` varchar(100) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `country_id` varchar(100) DEFAULT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `FK_5d2c9f8023e5baf613dadff7f34` (`country_id`),
  CONSTRAINT `FK_5d2c9f8023e5baf613dadff7f34` FOREIGN KEY (`country_id`) REFERENCES `country` (`id`)
); 

CREATE TABLE `party` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(255) DEFAULT '#000000',
  `leader_name` varchar(100) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
   `contestant_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_c0eb8cdcaaae44dae7538677080` (`created_by`),
  CONSTRAINT `FK_c0eb8cdcaaae44dae7538677080` FOREIGN KEY (`created_by`) REFERENCES `user` (`uguid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `surveys` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `total_votes` int NOT NULL DEFAULT '0',
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `is_anonymous` tinyint NOT NULL DEFAULT '1',
  `status` enum('draft','published','closed') NOT NULL DEFAULT 'draft',
  `survey_url` varchar(255) DEFAULT NULL,
  `short_url` varchar(255) DEFAULT NULL,  
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `FK_b395d649c64d92997cb33f4d572` (`created_by`),
  CONSTRAINT `FK_b395d649c64d92997cb33f4d572` FOREIGN KEY (`created_by`) REFERENCES `user` (`uguid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `survey_parties` (
  `id` varchar(255) NOT NULL,
  `survey_id` varchar(255) DEFAULT NULL,
  `party_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_9298f1694923ab599f190786fac` (`survey_id`),
  KEY `FK_15187d9b2f956d3e09ce3a6795a` (`party_id`),
  CONSTRAINT `FK_15187d9b2f956d3e09ce3a6795a` FOREIGN KEY (`party_id`) REFERENCES `party` (`id`),
  CONSTRAINT `FK_9298f1694923ab599f190786fac` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `temp_votes` (
  `id` varchar(255) NOT NULL,
  `voter_email` varchar(255) NOT NULL,
  `verification_code` varchar(6) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `expires_at` datetime NOT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `survey_id` varchar(255) NOT NULL,
  `party_id` varchar(255) NOT NULL,
  `verified` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `FK_dd3c6ee433444aea317c5180c55` (`survey_id`),
  KEY `FK_770abdaec112498d6b73d1398c6` (`party_id`),
  CONSTRAINT `FK_770abdaec112498d6b73d1398c6` FOREIGN KEY (`party_id`) REFERENCES `party` (`id`),
  CONSTRAINT `FK_dd3c6ee433444aea317c5180c55` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `votes` (
  `id` varchar(255) NOT NULL,
  `voter_email` varchar(255) NOT NULL,
  `voted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `gender` varchar(255) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `survey_id` varchar(255) DEFAULT NULL,
  `party_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_6f0d31fcfd3fb4f84d23848db28` (`survey_id`),
  KEY `FK_7d9d218e4d6defab183fbd069d3` (`party_id`),
  CONSTRAINT `FK_6f0d31fcfd3fb4f84d23848db28` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`),
  CONSTRAINT `FK_7d9d218e4d6defab183fbd069d3` FOREIGN KEY (`party_id`) REFERENCES `party` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `password_reset_tokens` (
  `id` varchar(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `otpHash` varchar(255) NOT NULL,
  `resetToken` varchar(255) DEFAULT NULL,
  `expiresAt` timestamp NOT NULL,
  `used` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_2ecfa961f2f3e33fff8e19b6c7` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


/*BLOG tables*/
CREATE TABLE `blog_posts` (
  `id` varchar(255) NOT NULL,
  `title` varchar(300) NOT NULL,
  `excerpt` text NOT NULL,
  `content_html` text NOT NULL,
  `category` varchar(50) NOT NULL,
  `category_label` varchar(80) NOT NULL,
  `tags` text NOT NULL,
  `author_name` varchar(100) NOT NULL,
  `author_role` varchar(100) NOT NULL,
  `author_initials` varchar(4) NOT NULL,
  `author_avatar_color` varchar(20) NOT NULL,
  `like_count` int NOT NULL DEFAULT '0',
  `comment_count` int NOT NULL DEFAULT '0',
  `view_count` int NOT NULL DEFAULT '0',
  `read_time` int NOT NULL DEFAULT '5',
  `trending` tinyint NOT NULL DEFAULT '0',
  `featured` tinyint NOT NULL DEFAULT '0',
  `published` tinyint NOT NULL DEFAULT '1',
  `published_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
);

CREATE INDEX idx_blog_posts_category   ON blog_posts(category);
CREATE INDEX idx_blog_posts_published  ON blog_posts(published, published_at DESC);
CREATE INDEX idx_blog_posts_trending   ON blog_posts(trending, view_count DESC);
CREATE INDEX idx_blog_posts_featured   ON blog_posts(featured);
CREATE INDEX idx_blog_posts_like_count ON blog_posts(like_count DESC);
CREATE INDEX idx_blog_posts_cmnt_count ON blog_posts(comment_count DESC);

-- Full text search
ALTER TABLE blog_posts ADD FULLTEXT(title, excerpt);


-- ═══════════════════════════════════════════════════════
-- TABLE 2: blog_comments
-- ═══════════════════════════════════════════════════════

CREATE TABLE `blog_comments` (
  `id` varchar(255) NOT NULL,
  `post_id` varchar(255) NOT NULL,
  `parent_id` varchar(255) DEFAULT NULL,
  `commenter_name` varchar(100) NOT NULL DEFAULT 'Anonymous',
  `commenter_initials` varchar(4) NOT NULL,
  `commenter_avatar_color` varchar(20) NOT NULL,
  `text` text NOT NULL,
  `like_count` int NOT NULL DEFAULT '0',
  `pinned` tinyint NOT NULL DEFAULT '0',
  `hidden` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_4e0b8959256b08ceb3d001f616b` (`post_id`),
  KEY `FK_e681eead24fde355111a223fc6d` (`parent_id`),
  CONSTRAINT `FK_4e0b8959256b08ceb3d001f616b` FOREIGN KEY (`post_id`) REFERENCES `blog_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_e681eead24fde355111a223fc6d` FOREIGN KEY (`parent_id`) REFERENCES `blog_comments` (`id`) ON DELETE CASCADE
);
/*
CREATE INDEX idx_blog_comments_post_id
ON blog_comments(post_id, parent_id, created_at DESC);

CREATE INDEX idx_blog_comments_parent_id
ON blog_comments(parent_id);
*/

-- ═══════════════════════════════════════════════════════
-- TABLE 3: blog_likes
-- ═══════════════════════════════════════════════════════

CREATE TABLE `blog_likes` (
  `id` varchar(255) NOT NULL,
  `post_id` varchar(255) NOT NULL,
  `session_key` varchar(200) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_3478ccbee6353508559f43a9aff` (`post_id`),
  CONSTRAINT `FK_3478ccbee6353508559f43a9aff` FOREIGN KEY (`post_id`) REFERENCES `blog_posts` (`id`) ON DELETE CASCADE
) ;
/*
CREATE INDEX idx_blog_likes_post_id
ON blog_likes(post_id);
*/

-- ═══════════════════════════════════════════════════════
-- TABLE 4: blog_qa
-- ═══════════════════════════════════════════════════════

CREATE TABLE `blog_qa` (
  `id` varchar(255) NOT NULL,
  `question` text NOT NULL,
  `answer` text NOT NULL,
  `category` varchar(50) NOT NULL,
  `category_label` varchar(80) NOT NULL,
  `helpful_count` int NOT NULL DEFAULT '0',
  `published` tinyint NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ;

CREATE INDEX idx_blog_qa_category
ON blog_qa(category);

CREATE INDEX idx_blog_qa_helpful_count
ON blog_qa(helpful_count DESC);

CREATE INDEX idx_blog_qa_published
ON blog_qa(published, sort_order);


-- ═══════════════════════════════════════════════════════
-- TABLE 5: user_questions
-- ═══════════════════════════════════════════════════════

CREATE TABLE `user_questions` (
  `id` varchar(255) NOT NULL,
  `question` text NOT NULL,
  `asker_name` varchar(100) NOT NULL DEFAULT 'Anonymous',
  `asker_email` varchar(255) DEFAULT NULL,
  `answered` tinyint NOT NULL DEFAULT '0',
  `answer` text,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `answered_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `answered_by` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ;

CREATE INDEX idx_user_questions_answered
ON user_questions(answered, created_at DESC);

CREATE INDEX idx_user_questions_created
ON user_questions(created_at DESC);


-- ═══════════════════════════════════════════════════════
-- TABLE 6: newsletter_subscribers
-- ═══════════════════════════════════════════════════════

CREATE TABLE newsletter_subscribers (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

    email VARCHAR(255) NOT NULL UNIQUE,
    active TINYINT(1) DEFAULT 1,

    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP NULL
);

CREATE INDEX idx_newsletter_email
ON newsletter_subscribers(email);

CREATE INDEX idx_newsletter_active
ON newsletter_subscribers(active);


-- ═══════════════════════════════════════════════════════
-- TABLE 7: blog_views
-- ═══════════════════════════════════════════════════════

CREATE TABLE blog_views (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

    post_id CHAR(36) NOT NULL,
    session_key VARCHAR(200),
    referrer VARCHAR(500),

    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_blog_views_post
        FOREIGN KEY (post_id) REFERENCES blog_posts(id)
        ON DELETE CASCADE
);
/*
CREATE INDEX idx_blog_views_post_id
ON blog_views(post_id, viewed_at DESC);

CREATE INDEX idx_blog_views_date
ON blog_views(viewed_at DESC);
*/


/*
INSERT INTO country (id,name,iso_code) VALUES
(UUID(),'India','IN'),
(UUID(),'United States','US'),
(UUID(),'United Kingdom','UK'),
(UUID(),'Germany','DE'),
(UUID(),'France','FR'),
(UUID(),'Italy','IT'),
(UUID(),'Spain','ES'),
(UUID(),'Canada','CA'),
(UUID(),'Australia','AU'),
(UUID(),'Brazil','BR'),
(UUID(),'Japan','JP'),
(UUID(),'South Korea','KR'),
(UUID(),'Pakistan','PK'),
(UUID(),'Bangladesh','BD'),
(UUID(),'Sri Lanka','LK'),
(UUID(),'Nepal','NP'),
(UUID(),'Mexico','MX'),
(UUID(),'Argentina','AR'),
(UUID(),'South Africa','ZA'),
(UUID(),'Nigeria','NG');

*/

/*

-- india

INSERT INTO party_master
(id,name,color,leader_name,contestant_name,logo_url,country_id,created_by,created_at)
VALUES
(UUID(),'Bharatiya Janata Party','#FF9933','Narendra Modi','TBD','https://images.seeklogo.com/logo-png/44/1/bjp-logo-png_seeklogo-440196.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Indian National Congress','#19AAED','Mallikarjun Kharge','TBD','https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Indian_National_Congress_Flag.svg/640px-Indian_National_Congress_Flag.svg.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Aam Aadmi Party','#00AEEF','Arvind Kejriwal','TBD','https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Aam-aadmi-party-logo.jpg/640px-Aam-aadmi-party-logo.jpg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Bahujan Samaj Party','#0033A0','Mayawati','TBD','https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Bahujan_Samaj_Party_Flag.svg/640px-Bahujan_Samaj_Party_Flag.svg.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Samajwadi Party','#D60000','Akhilesh Yadav','TBD','https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Samajwadi_Party_Flag.svg/640px-Samajwadi_Party_Flag.svg.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Dravida Munnetra Kazhagam (DMK)','#E31E24','M K Stalin','TBD','https://images.seeklogo.com/logo-png/41/1/dmk-logo-png_seeklogo-411320.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'AIADMK','#008000','Edappadi K Palaniswami','TBD','https://images.seeklogo.com/logo-png/41/1/aiadmk-logo-png_seeklogo-411321.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Trinamool Congress','#009933','Mamata Banerjee','TBD','https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/All_India_Trinamool_Congress_flag_%283%29.svg/640px-All_India_Trinamool_Congress_flag_%283%29.svg.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Telugu Desam Party','#FFFF00','N Chandrababu Naidu','TBD','https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Telugu_Desam_Party_Flag.png/640px-Telugu_Desam_Party_Flag.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'YSR Congress Party','#1E90FF','Y S Jagan Mohan Reddy','TBD','https://4.bp.blogspot.com/-ELaPNYlWzDQ/TXvaYIjau0I/AAAAAAAAKhE/E3OhtfWqpNM/s1600/ysr_flag.jpg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),

(UUID(),'Shiv Sena','#FF7F00','Uddhav Thackeray','TBD','https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Shiv_Sena_flag.jpg/640px-Shiv_Sena_flag.jpg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Nationalist Congress Party','#008000','Sharad Pawar','TBD','https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/NCP-flag.svg/640px-NCP-flag.svg.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Biju Janata Dal','#0066CC','Naveen Patnaik','TBD','https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Biju_Janata_Dal_Flag.jpg/640px-Biju_Janata_Dal_Flag.jpg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Rashtriya Janata Dal','#008000','Lalu Prasad Yadav','TBD','https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/RJD_Flag.svg/640px-RJD_Flag.svg.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Janata Dal United','#006400','Nitish Kumar','TBD','https://upload.wikimedia.org/wikipedia/en/8/8f/Janata_Dal_United_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Lok Janshakti Party','#FFCC00','Chirag Paswan','TBD','https://upload.wikimedia.org/wikipedia/en/4/4d/Lok_Janshakti_Party_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Communist Party of India','#FF0000','D Raja','TBD','https://upload.wikimedia.org/wikipedia/commons/4/45/Flag_of_the_Communist_Party_of_India.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Communist Party of India Marxist','#CC0000','Sitaram Yechury','TBD','https://upload.wikimedia.org/wikipedia/commons/2/2c/Flag_of_the_Communist_Party_of_India_%28Marxist%29.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),

(UUID(),'Jharkhand Mukti Morcha','#228B22','Hemant Soren','TBD','https://upload.wikimedia.org/wikipedia/en/3/3e/Jharkhand_Mukti_Morcha_Flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Maharashtra Navnirman Sena','#FF9900','Raj Thackeray','TBD','https://upload.wikimedia.org/wikipedia/en/5/5a/MNS_Flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Apna Dal','#009999','Anupriya Patel','TBD','https://upload.wikimedia.org/wikipedia/en/a/a6/Apna_Dal_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Rashtriya Lok Dal','#006600','Jayant Chaudhary','TBD','https://upload.wikimedia.org/wikipedia/en/6/60/RLD_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Assam Gana Parishad','#009933','Atul Bora','TBD','https://upload.wikimedia.org/wikipedia/en/7/7c/AGP_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),

(UUID(),'People Democratic Party','#008080','Mehbooba Mufti','TBD','https://upload.wikimedia.org/wikipedia/en/7/75/Jammu_and_Kashmir_PDP_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Jammu and Kashmir National Conference','#CC0000','Farooq Abdullah','TBD','https://upload.wikimedia.org/wikipedia/en/7/74/Jammu_and_Kashmir_National_Conference_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Indian Union Muslim League','#228B22','K M Kader Mohideen','TBD','https://upload.wikimedia.org/wikipedia/en/6/6b/IUML_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Kerala Congress','#33AA33','Jose K Mani','TBD','https://upload.wikimedia.org/wikipedia/en/2/22/Kerala_Congress_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),

(UUID(),'Pattali Makkal Katchi','#FF0000','Anbumani Ramadoss','TBD','https://kids.kiddle.co/images/6/67/Pmk_flag.jpg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Desiya Murpokku Dravida Kazhagam','#000000','Vijayakanth','TBD','https://upload.wikimedia.org/wikipedia/en/7/70/DMDK_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Naam Tamilar Katchi','#CC0000','Seeman','TBD','https://imagesvs.oneindia.com/politician-profiles/image/parties/party-flags/naam-tamilar-katchi-flag-912.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Viduthalai Chiruthaigal Katchi','#0000FF','Thol Thirumavalavan','TBD','https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/VCK.svg/640px-VCK.svg.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'All India Forward Bloc','#FF0000','G Devarajan','TBD','https://upload.wikimedia.org/wikipedia/en/f/f0/AIFB_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),

(UUID(),'Revolutionary Socialist Party','#FF0000','Manoj Bhattacharya','TBD','https://upload.wikimedia.org/wikipedia/en/3/3d/RSP_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'All India Majlis-e-Ittehadul Muslimeen','#008000','Asaduddin Owaisi','TBD','https://upload.wikimedia.org/wikipedia/en/0/0f/AIMIM_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Goa Forward Party','#FF6600','Vijai Sardesai','TBD','https://upload.wikimedia.org/wikipedia/en/5/5a/Goa_Forward_Party_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Mizo National Front','#3366CC','Zoramthanga','TBD','https://upload.wikimedia.org/wikipedia/en/2/2a/MNF_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'National People Party','#FFAA00','Conrad Sangma','TBD','https://upload.wikimedia.org/wikipedia/en/2/27/NPP_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),

(UUID(),'United Democratic Party','#336699','Metbah Lyngdoh','TBD','https://upload.wikimedia.org/wikipedia/en/7/70/UDP_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Hill State People Democratic Party','#228B22','KP Pangniang','TBD','https://upload.wikimedia.org/wikipedia/en/2/2f/HSPDP_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Sikkim Democratic Front','#00AEEF','Pawan Kumar Chamling','TBD','https://upload.wikimedia.org/wikipedia/en/3/3b/SDF_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Sikkim Krantikari Morcha','#FF0000','Prem Singh Tamang','TBD','https://upload.wikimedia.org/wikipedia/en/6/60/SKM_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),

(UUID(),'Tipra Motha Party','#800080','Pradyot Bikram Manikya','TBD','https://upload.wikimedia.org/wikipedia/en/6/63/TMP_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Tripura Indigenous Progressive Regional Alliance','#FFCC00','Motha Leader','TBD','https://upload.wikimedia.org/wikipedia/en/1/14/TIPRA_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Bodoland Peoples Front','#FF0000','Hagrama Mohilary','TBD','https://upload.wikimedia.org/wikipedia/en/3/3c/BPF_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'United Peoples Party Liberal','#0099CC','Pramod Boro','TBD','https://upload.wikimedia.org/wikipedia/en/2/23/UPPL_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Haryana Jannayak Janta Party','#FFFF00','Dushyant Chautala','TBD','https://upload.wikimedia.org/wikipedia/en/2/27/JJP_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),

(UUID(),'Indian National Lok Dal','#009933','Om Prakash Chautala','TBD','https://upload.wikimedia.org/wikipedia/en/7/7d/INLD_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Shiromani Akali Dal','#000080','Sukhbir Singh Badal','TBD','https://upload.wikimedia.org/wikipedia/en/3/34/SAD_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Telangana Rashtra Samithi','#FF69B4','K Chandrashekar Rao','TBD','https://upload.wikimedia.org/wikipedia/en/5/5c/TRS_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Bharat Rashtra Samithi','#FF69B4','K Chandrashekar Rao','TBD','https://upload.wikimedia.org/wikipedia/en/5/5c/TRS_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Janasena Party','#FF0000','Pawan Kalyan','TBD','https://upload.wikimedia.org/wikipedia/en/4/4e/Janasena_Party_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),

(UUID(),'Kerala Congress Mani','#33AA33','Jose K Mani','TBD','https://upload.wikimedia.org/wikipedia/en/2/22/Kerala_Congress_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Kerala Congress Joseph','#33AA33','P J Joseph','TBD','https://upload.wikimedia.org/wikipedia/en/2/22/Kerala_Congress_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Revolutionary Marxist Party','#CC0000','TK Ramakrishnan','TBD','https://upload.wikimedia.org/wikipedia/en/3/3d/RMP_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'All India N R Congress','#3366CC','N Rangasamy','TBD','https://upload.wikimedia.org/wikipedia/en/8/8f/NR_Congress_flag.svg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'All India Anna Dravida Munnetra Kazhagam','#008000','Edappadi K Palaniswami','TBD','https://images.seeklogo.com/logo-png/41/1/aiadmk-logo-png_seeklogo-411321.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Tamilaga Vettri Kazhagam','#c00500','Vijay','TBD','https://storage.googleapis.com/inv-images/party-logos/tvk.jpg',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW());

INSERT INTO party_master
(id,name,color,leader_name,contestant_name,logo_url,country_id,created_by,created_at)
VALUES
(UUID(),'Amma Makkal Munnetra Kazhagam (AMMK)','#c00500','Vijay','TBD','https://images.seeklogo.com/logo-png/41/1/aiadmk-logo-png_seeklogo-411321.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Marumalarchi Dravida Munnetra Kazhagam (MDMK)','#E31E24','M K Stalin','TBD','https://images.seeklogo.com/logo-png/41/1/dmk-logo-png_seeklogo-411320.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Tamil Maanila Congress (moopanar) (TMC(M))','#c00500','Vijay','TBD','https://images.seeklogo.com/logo-png/44/1/bjp-logo-png_seeklogo-440196.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW()),
(UUID(),'Indiya Jananayaka Katchi (IJK)','#c00500','Vijay','TBD','https://images.seeklogo.com/logo-png/44/1/bjp-logo-png_seeklogo-440196.png',(SELECT id FROM country WHERE iso_code='IN'),'system',NOW());

-- UK
INSERT INTO party_master
(id,name,color,leader_name,contestant_name,logo_url,country_id,created_by,created_at)
VALUES
(UUID(),'Conservative Party','#0087DC','Rishi Sunak','TBD','https://upload.wikimedia.org/wikipedia/en/9/9c/Conservative_Party_logo.svg',(SELECT id FROM country WHERE iso_code='UK'),'system',NOW()),
(UUID(),'Labour Party','#E4003B','Keir Starmer','TBD','https://upload.wikimedia.org/wikipedia/en/b/bf/Labour_Party_logo.svg',(SELECT id FROM country WHERE iso_code='UK'),'system',NOW()),
(UUID(),'Liberal Democrats','#FAA61A','Ed Davey','TBD','https://upload.wikimedia.org/wikipedia/en/5/59/Liberal_Democrats_logo.svg',(SELECT id FROM country WHERE iso_code='UK'),'system',NOW()),
(UUID(),'Scottish National Party','#FFF95D','Humza Yousaf','TBD','https://upload.wikimedia.org/wikipedia/en/0/06/Scottish_National_Party_logo.svg',(SELECT id FROM country WHERE iso_code='UK'),'system',NOW()),

(UUID(),'Social Democratic Party of Germany','#E3000F','Olaf Scholz','TBD','https://upload.wikimedia.org/wikipedia/commons/5/5f/Logo_SPD.svg',(SELECT id FROM country WHERE iso_code='DE'),'system',NOW()),
(UUID(),'Christian Democratic Union','#000000','Friedrich Merz','TBD','https://upload.wikimedia.org/wikipedia/commons/3/37/CDU_Logo.svg',(SELECT id FROM country WHERE iso_code='DE'),'system',NOW()),
(UUID(),'Alliance 90 The Greens','#1AA037','Ricarda Lang','TBD','https://upload.wikimedia.org/wikipedia/commons/6/6c/Die_Gruenen_Logo.svg',(SELECT id FROM country WHERE iso_code='DE'),'system',NOW()),
(UUID(),'Free Democratic Party','#FFED00','Christian Lindner','TBD','https://upload.wikimedia.org/wikipedia/commons/0/0f/FDP_Logo.svg',(SELECT id FROM country WHERE iso_code='DE'),'system',NOW()),

(UUID(),'Renaissance','#FFD700','Emmanuel Macron','TBD','https://upload.wikimedia.org/wikipedia/commons/3/3c/Renaissance_party_logo.svg',(SELECT id FROM country WHERE iso_code='FR'),'system',NOW()),
(UUID(),'National Rally','#002395','Jordan Bardella','TBD','https://upload.wikimedia.org/wikipedia/commons/8/8b/Rassemblement_national_logo.svg',(SELECT id FROM country WHERE iso_code='FR'),'system',NOW()),
(UUID(),'Socialist Party','#E30613','Olivier Faure','TBD','https://upload.wikimedia.org/wikipedia/commons/7/75/Parti_socialiste_logo.svg',(SELECT id FROM country WHERE iso_code='FR'),'system',NOW()),

(UUID(),'Brothers of Italy','#003399','Giorgia Meloni','TBD','https://upload.wikimedia.org/wikipedia/commons/8/84/Fratelli_d%27Italia_logo.svg',(SELECT id FROM country WHERE iso_code='IT'),'system',NOW()),
(UUID(),'Democratic Party','#009933','Elly Schlein','TBD','https://upload.wikimedia.org/wikipedia/commons/4/4d/Partito_Democratico_logo.svg',(SELECT id FROM country WHERE iso_code='IT'),'system',NOW()),

(UUID(),'Spanish Socialist Workers Party','#E3001B','Pedro Sanchez','TBD','https://upload.wikimedia.org/wikipedia/commons/2/2f/PSOE_logo.svg',(SELECT id FROM country WHERE iso_code='ES'),'system',NOW()),
(UUID(),'People Party','#0056A3','Alberto Nunez Feijoo','TBD','https://upload.wikimedia.org/wikipedia/commons/5/5c/Partido_Popular_logo.svg',(SELECT id FROM country WHERE iso_code='ES'),'system',NOW());

-- USA
INSERT INTO party_master
(id,name,color,leader_name,contestant_name,logo_url,country_id,created_by,created_at)
VALUES
(UUID(),'Democratic Party','#0015BC','Joe Biden','TBD','https://upload.wikimedia.org/wikipedia/commons/0/02/Democratic_Party_%28United_States%29_logo.svg',(SELECT id FROM country WHERE iso_code='US'),'system',NOW()),
(UUID(),'Republican Party','#E9141D','Donald Trump','TBD','https://upload.wikimedia.org/wikipedia/commons/9/9b/Republicanlogo.svg',(SELECT id FROM country WHERE iso_code='US'),'system',NOW()),
(UUID(),'Libertarian Party','#FDBB30','Angela McArdle','TBD','https://upload.wikimedia.org/wikipedia/commons/9/9e/Libertarian_Party_logo.svg',(SELECT id FROM country WHERE iso_code='US'),'system',NOW()),
(UUID(),'Green Party','#00A95C','Jill Stein','TBD','https://upload.wikimedia.org/wikipedia/commons/6/6c/Green_Party_US_logo.svg',(SELECT id FROM country WHERE iso_code='US'),'system',NOW()),

(UUID(),'Liberal Party of Canada','#D71920','Justin Trudeau','TBD','https://upload.wikimedia.org/wikipedia/en/6/6e/Liberal_Party_of_Canada_logo.svg',(SELECT id FROM country WHERE iso_code='CA'),'system',NOW()),
(UUID(),'Conservative Party of Canada','#002395','Pierre Poilievre','TBD','https://upload.wikimedia.org/wikipedia/en/b/b0/Conservative_Party_of_Canada_logo.svg',(SELECT id FROM country WHERE iso_code='CA'),'system',NOW()),

(UUID(),'Workers Party','#CC0000','Luiz Inacio Lula da Silva','TBD','https://upload.wikimedia.org/wikipedia/commons/0/0e/Partido_dos_Trabalhadores_logo.svg',(SELECT id FROM country WHERE iso_code='BR'),'system',NOW()),
(UUID(),'Liberal Party Brazil','#005BBB','Valdemar Costa Neto','TBD','https://upload.wikimedia.org/wikipedia/commons/e/e3/Partido_Liberal_logo.svg',(SELECT id FROM country WHERE iso_code='BR'),'system',NOW()),

(UUID(),'National Regeneration Movement','#8B0000','Andres Manuel Lopez Obrador','TBD','https://upload.wikimedia.org/wikipedia/commons/0/09/Morena_logo.svg',(SELECT id FROM country WHERE iso_code='MX'),'system',NOW());

-- PK
INSERT INTO party_master
(id,name,color,leader_name,contestant_name,logo_url,country_id,created_by,created_at)

VALUES
(UUID(),'Pakistan Tehreek-e-Insaf','#007A3D','Imran Khan','TBD','https://upload.wikimedia.org/wikipedia/en/1/1c/PTI_flag.svg',(SELECT id FROM country WHERE iso_code='PK'),'system',NOW()),
(UUID(),'Pakistan Muslim League N','#006600','Shehbaz Sharif','TBD','https://upload.wikimedia.org/wikipedia/en/5/5f/PMLN_flag.svg',(SELECT id FROM country WHERE iso_code='PK'),'system',NOW()),
(UUID(),'Pakistan Peoples Party','#000000','Bilawal Bhutto Zardari','TBD','https://upload.wikimedia.org/wikipedia/en/3/33/PPP_flag.svg',(SELECT id FROM country WHERE iso_code='PK'),'system',NOW());

-- BD
INSERT INTO party_master
(id,name,color,leader_name,contestant_name,logo_url,country_id,created_by,created_at)
VALUES
(UUID(),'Awami League','#006A4E','Sheikh Hasina','TBD','https://upload.wikimedia.org/wikipedia/en/6/6f/Awami_League_flag.svg',(SELECT id FROM country WHERE iso_code='BD'),'system',NOW()),
(UUID(),'Bangladesh Nationalist Party','#006600','Khaleda Zia','TBD','https://upload.wikimedia.org/wikipedia/en/7/7a/BNP_flag.svg',(SELECT id FROM country WHERE iso_code='BD'),'system',NOW());
-- Nepal
INSERT INTO party_master
(id,name,color,leader_name,contestant_name,logo_url,country_id,created_by,created_at)
VALUES
(UUID(),'Nepali Congress','#1E90FF','Sher Bahadur Deuba','TBD','https://upload.wikimedia.org/wikipedia/en/2/2e/Nepali_Congress_flag.svg',(SELECT id FROM country WHERE iso_code='NP'),'system',NOW()),
(UUID(),'Communist Party of Nepal UML','#CC0000','K P Sharma Oli','TBD','https://upload.wikimedia.org/wikipedia/en/0/0c/CPN-UML_flag.svg',(SELECT id FROM country WHERE iso_code='NP'),'system',NOW());
-- SL
INSERT INTO party_master
(id,name,color,leader_name,contestant_name,logo_url,country_id,created_by,created_at)
VALUES
(UUID(),'Sri Lanka Podujana Peramuna','#8B0000','Mahinda Rajapaksa','TBD','https://upload.wikimedia.org/wikipedia/en/5/5e/SLPP_flag.svg',(SELECT id FROM country WHERE iso_code='LK'),'system',NOW()),
(UUID(),'United National Party','#00AEEF','Ranil Wickremesinghe','TBD','https://upload.wikimedia.org/wikipedia/en/2/2c/UNP_flag.svg',(SELECT id FROM country WHERE iso_code='LK'),'system',NOW());
-- Japan
INSERT INTO party_master
(id,name,color,leader_name,contestant_name,logo_url,country_id,created_by,created_at)
VALUES
(UUID(),'Liberal Democratic Party','#003399','Fumio Kishida','TBD','https://upload.wikimedia.org/wikipedia/commons/9/9f/LDP_Japan_logo.svg',(SELECT id FROM country WHERE iso_code='JP'),'system',NOW()),
(UUID(),'Constitutional Democratic Party','#007FFF','Kenta Izumi','TBD','https://upload.wikimedia.org/wikipedia/commons/7/7e/CDP_logo.svg',(SELECT id FROM country WHERE iso_code='JP'),'system',NOW());

-- South Korea
INSERT INTO party_master
(id,name,color,leader_name,contestant_name,logo_url,country_id,created_by,created_at)
VALUES
(UUID(),'Democratic Party of Korea','#005BAC','Lee Jae-myung','TBD','https://upload.wikimedia.org/wikipedia/commons/2/2e/Democratic_Party_of_Korea_logo.svg',(SELECT id FROM country WHERE iso_code='KR'),'system',NOW()),
(UUID(),'People Power Party','#E61E2A','Han Dong-hoon','TBD','https://upload.wikimedia.org/wikipedia/commons/3/35/People_Power_Party_logo.svg',(SELECT id FROM country WHERE iso_code='KR'),'system',NOW());

-- Indonesia
INSERT INTO party_master
(id,name,color,leader_name,contestant_name,logo_url,country_id,created_by,created_at)
VALUES
(UUID(),'Indonesian Democratic Party of Struggle','#E3000F','Megawati Sukarnoputri','TBD','https://upload.wikimedia.org/wikipedia/commons/3/3e/PDI-P_logo.svg',(SELECT id FROM country WHERE iso_code='ID'),'system',NOW()),
(UUID(),'Golkar','#FFD700','Airlangga Hartarto','TBD','https://upload.wikimedia.org/wikipedia/commons/e/e2/Golkar_logo.svg',(SELECT id FROM country WHERE iso_code='ID'),'system',NOW()),
(UUID(),'Gerindra','#B22222','Prabowo Subianto','TBD','https://upload.wikimedia.org/wikipedia/commons/3/3e/Gerindra_logo.svg',(SELECT id FROM country WHERE iso_code='ID'),'system',NOW());

*/

/*
insert into country (id, name, iso_code) values('4b389655-3e65-4771-869d-2209efa6cf61', 'India', 'IN');
insert into country (id, name, iso_code) values('09d48d7c-6327-4537-902b-7154f69f87be', 'United States', 'US');
insert into country (id, name, iso_code) values('67377e60-c007-477d-92fa-c6e01294bbdd', 'United Kingdom', 'UK');
insert into country (id, name, iso_code) values('87f117f0-217b-4e5d-a337-bf23b9b0f8da', 'Germany', 'DE');
insert into country (id, name, iso_code) values('e2336c2c-fd9b-4c5a-a42e-d7f0a53b713f', 'France', 'FR');
insert into country (id, name, iso_code) values('c7654f04-9fc2-435e-a7ee-2247032989ad', 'Italy', 'IT');
insert into country (id, name, iso_code) values('b22bdc92-6528-4038-9e03-5d3c3d7f605b', 'Spain', 'ES');
insert into country (id, name, iso_code) values('80596187-2cbc-4d90-9bc8-1304eeb27bf4', 'Canada', 'CA');
insert into country (id, name, iso_code) values('cb9a7b88-4980-432f-bf22-ae5ecd920af0', 'Australia', 'AU');
insert into country (id, name, iso_code) values('c21c5803-793f-47c0-b7c8-21ff5fd20de3', 'Brazil', 'BR');
insert into country (id, name, iso_code) values('e5882ea4-ebfa-4e3c-b8b7-d8988abfdda1', 'Japan', 'JP');
insert into country (id, name, iso_code) values('9b9ed1f9-2ce9-4c54-a9bb-3f1f43525621', 'South Korea', 'KR');
insert into country (id, name, iso_code) values('bec122f5-638b-49a8-bf45-cb33a8b0aada', 'Pakistan', 'PK');
insert into country (id, name, iso_code) values('1b2803b9-669c-41ee-97f6-5f064c9b8637', 'Bangladesh', 'BD');
insert into country (id, name, iso_code) values('760e5375-8a33-45d9-bbf7-522891f4a007', 'Sri Lanka', 'LK');
insert into country (id, name, iso_code) values('9f2604d9-19c4-4052-be42-3c39924db1e2', 'Nepal', 'NP');
insert into country (id, name, iso_code) values('078a0e97-a069-42ef-a81a-a8d6a76483fe', 'Mexico', 'MX');
insert into country (id, name, iso_code) values('47504b91-ae99-4df1-992d-2c3e3f8de053', 'Argentina', 'AR');
insert into country (id, name, iso_code) values('c474467c-7d80-4075-a11f-3364148adff4', 'South Africa', 'ZA');
insert into country (id, name, iso_code) values('4accd5d2-f9bd-4629-9712-4a7202dc9217', 'Nigeria', 'NG');

update survey.states set country_id = '4b389655-3e65-4771-869d-2209efa6cf61';
update survey.districts set country_id = '4b389655-3e65-4771-869d-2209efa6cf61';
update survey.constituency set country_id = '4b389655-3e65-4771-869d-2209efa6cf61';

*/

/*
-- 31a8af2e-356c-11f1-a204-16ffd85aa295
INSERT INTO `states` VALUES ('16615b08-f4d2-4ef1-af6d-ab1029edc981','AN','Andaman and Nicobar Islands','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('17bdcf11-66b0-4cc2-a15d-577c87d5625c','NL','Nagaland','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('19f308cb-8158-421f-a75d-416873ca4bde','ML','Meghalaya','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('271c62d6-e39e-4993-99c3-1a8928bc23ca','GA','Goa','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('3a064db6-d503-4371-b4da-fc6972b6ebdb','WB','West Bengal','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('3c2823f4-595f-439d-b619-0767efbe9daf','CH','Chandigarh','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('443168b6-af85-4bdb-8daa-80a458fc5b76','SK','Sikkim','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('4bdc893c-7981-413e-b635-e7d0929cb339','MH','Maharashtra','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('4cb61d68-f618-4307-949f-66696fdf6ccc','OR','Odisha','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('508313a2-fa88-4181-811e-8999960b8223','JK','Jammu and Kashmir','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('511f2ca7-0f6f-4562-a1df-fbfd1258f8ae','JH','Jharkhand','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('56e6e157-4f8a-4f59-9256-3118889371c0','HP','Himachal Pradesh','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('56f89e2c-4b7d-4091-8675-18b7e574f359','MN','Manipur','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('59930b2c-f082-4a7f-95a8-92676f5cae77','DL','Delhi','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('6349e7c4-cee6-45fe-b7d2-c855fe227eac','BR','Bihar','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('65efe778-7f10-45e9-b5b0-c58dee43e12c','GJ','Gujarat','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('68628c43-8739-40d7-ab55-923c9a0d6a7d','TN','Tamil Nadu','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('6b74679f-8908-4f21-9328-18ef72e3ce17','TG','Telangana','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('6de6d059-2bb9-4e81-ac04-8602464cfbce','PB','Punjab','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('7afc68f6-c46e-4f0b-b642-6400d8f85718','UT','Uttarakhand','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('7cbb1d7a-c630-4d30-b815-0e3c7263985d','MZ','Mizoram','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('837399c3-7d10-4bf5-9334-dd83ef376831','DD','Daman and Diu','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('96213ed9-9fed-401e-b20e-bc5ff55bcfe0','AS','Assam','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('ad9ee1f4-84b4-4349-b8d4-93e65d902c34','MP','Madhya Pradesh','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('b2a2332f-04d9-49b0-b129-c34caae097bc','RJ','Rajasthan','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('b4a65d0b-3c58-4013-a4c9-0b53afe4aaa6','LD','Lakshadweep','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('b814eeec-14ad-45f5-bf56-f99ee0d4420b','KA','Karnataka','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('ccb8bf65-95b0-49d0-9e34-f40cae21b89e','AR','Arunachal Pradesh','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('ce44de03-425f-47d1-af0e-e54c9e1923c5','DN','Dadra and Nagar Haveli','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('d4fefcc3-a915-46f3-866f-58081f5f2bc6','UP','Uttar Pradesh','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('d8dc0ba7-3a43-4b83-97c1-520263279efa','HR','Haryana','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('e353417b-c8a0-4922-be4e-d21caac45c3a','AP','Andhra Pradesh','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('e426b203-811a-4d59-be05-f6434d2908ea','KL','Kerala','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('e464d25e-d587-49db-9fa9-f280c7144ca7','CT','Chhattisgarh','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('f4925d5b-1eed-49e3-955e-6541fb00c378','PY','Puducherry','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('fcd85428-4efd-482b-9493-1b928939a6b9','TR','Tripura','31a8af2e-356c-11f1-a204-16ffd85aa295');
*/

/*

INSERT INTO `districts` (id, code, name, state_id, country_id) VALUES ('0fd86ea7-25eb-4f20-b4ad-2fe7dda7e382','Pudukkottai','Pudukkottai','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('13563db6-dce7-4b82-81dd-bac5d416110d','Tiruppur','Tiruppur','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),
('16857f49-0ac0-41c8-b5f4-b745f6f98fe3','Tenkasi','Tenkasi','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('25314415-663a-4244-9db1-5c2962868664','Perambalur','Perambalur','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('2fd5e362-8a2e-4b90-8d5f-b71353a07527','Tiruvannamalai','Tiruvannamalai','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('3241e526-54ac-4d28-a7d3-0f1d3d3c30a9','Villupuram','Villupuram','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('33b86357-1153-4e41-9b99-b9685e128df9','Chengalpattu','Chengalpattu','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('3a93651e-764f-48f3-8748-25b303c32304','Dharmapuri','Dharmapuri','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('3d64dbe1-2a99-4303-9307-175d56e6d9e6','Kallakurichi','Kallakurichi','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('3db015df-eb65-405f-8488-eea72eb6e087','Thanjavur','Thanjavur','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('3f86a37b-6817-4dc5-babd-73c972962aca','Ramanathapuram','Ramanathapuram','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('411fa10a-e041-4683-875d-28df1d94b660','The Nilgiris','The Nilgiris','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('43e8d60c-0e2c-42f0-95d9-48b6ed30d923','Karur','Karur','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('4fa55af9-22fb-4523-b6c5-1629a9db82a5','Ranipet','Ranipet','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('50ffbb0b-1865-4bf1-9af1-2af3f37ff5bd','Krishnagiri','Krishnagiri','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('56ded4ab-571b-4a09-914a-e6c00bd31ee5','Vellore','Vellore','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('62d629ce-cf5a-4c6c-9e52-d7fe59a7b356','Salem','Salem','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('63cbd559-4eec-4e0e-b0fb-6381dfe6c073','Chennai','Chennai','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('69483f23-6312-4c39-826f-a058c83f421a','Dindigul','Dindigul','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('6a1bb690-7bc3-47d8-9672-e2ba8682155e','Tirunelveli','Tirunelveli','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('6c99dc2a-7e9b-49e5-b090-58033936d735','Virudhunagar','Virudhunagar','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('76168604-65fc-439f-8e23-05d731626567','Thiruvallur','Thiruvallur','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('765638d5-e10a-48eb-8d27-f6d14840aae6','Ariyalur','Ariyalur','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('892cee4a-7fb9-4377-ad35-2a19cd8e831e','Madurai','Madurai','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('8e63bc03-1c9e-4f11-bfec-37eea3e8d2d1','Cuddalore','Cuddalore','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('9070969c-1cf1-48f9-b11b-e2e1caf2025d','Tirupathur','Tirupathur','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('921e9373-3cfa-4f23-89c6-416c273980ac','Thiruvarur','Thiruvarur','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('95f7baf3-92ec-4aae-a8d9-7a791a502c75','Theni','Theni','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('a1a0a7bc-5e63-4724-b6f5-606e6f15021d','Thoothukudi','Thoothukudi','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('a8c5de5c-8c96-4943-9ba3-6792f4a0c35b','Kancheepuram','Kancheepuram','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('b9a7adbb-ccdb-412f-ae95-c0b8705d7444','Mayiladuthurai','Mayiladuthurai','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('c4173481-1e2e-4675-900e-fdab918f8db9','Namakkal','Namakkal','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('c94e37d8-fe96-4f52-8f19-579dad42775c','Tiruchirappalli','Tiruchirappalli','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('e11a7362-b58a-4c5c-b0ed-76a4d0e78e68','Sivagangai','Sivagangai','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('e2efd18f-6894-41eb-a8db-08cdb7f21267','Erode','Erode','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('ed2f933e-4515-4f49-901e-1047a9d1bb9f','Kanyakumari','Kanyakumari','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('f13374c1-516b-4538-a8d9-502ee3b7559d','Nagapattinam','Nagapattinam','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295'),('fadd0541-32fa-4fb6-928b-1c74a1fd8686','Coimbatore','Coimbatore','68628c43-8739-40d7-ab55-923c9a0d6a7d','31a8af2e-356c-11f1-a204-16ffd85aa295');


*/

/*
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url, country_id,	created_by) values ('dc3f3d6e-9b0c-4c66-82b0-4ef4057f51a6', 'Gerindra', '#B22222', 'Prabowo Subianto', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Partai_Gerindra_logo.jpg/640px-Partai_Gerindra_logo.jpg', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url, country_id,	created_by) values ('66f31c33-3912-4310-aa44-a25fbc6b3d2c', 'Golkar', '#FFD700', 'Airlangga Hartarto', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Logo_Golkar.svg/640px-Logo_Golkar.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('1f16f534-821d-4ee1-8799-3b079e286564', 'Indonesian Democratic Party of Struggle', '#E3000F', 'Megawati Sukarnoputri', 'TBD', 'https://tse1.mm.bing.net/th/id/OIP._W_L2FY37VuxugPOIlGENAAAAA?rs=1&pid=ImgDetMain&o=7&rm=3', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('d4bf5bd9-e863-4248-8490-05b698529b69', 'Aam Aadmi Party', '#00AEEF', 'Arvind Kejriwal', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Aam_Aadmi_Party_Flag.svg/640px-Aam_Aadmi_Party_Flag.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('0ce8f9aa-434c-402c-ac1c-8b68cbca73c5', 'AIADMK', '#008000', 'Edappadi K Palaniswami', 'TBD', 'https://images.seeklogo.com/logo-png/41/1/aiadmk-logo-png_seeklogo-411321.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('d7fb35bb-cd73-4619-ab55-6dd15091f242', 'All India Anna Dravida Munnetra Kazhagam', '#008000', 'Edappadi K Palaniswami', 'TBD', 'https://images.seeklogo.com/logo-png/41/1/aiadmk-logo-png_seeklogo-411321.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('ad05e341-80eb-4fa6-8829-91f3e6bb7805', 'All India Forward Bloc', '#FF0000', 'G Devarajan', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/All_India_Forward_Bloc_flag.svg/640px-All_India_Forward_Bloc_flag.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('6bdbb148-0e06-4aee-82ff-f69f453e2df3', 'All India Majlis-e-Ittehadul Muslimeen', '#008000', 'Asaduddin Owaisi', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/All_India_Majlis-e-Ittehadul_Muslimeen_logo.svg/640px-All_India_Majlis-e-Ittehadul_Muslimeen_logo.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('925ec90f-83f2-4229-b8e7-be8330c0a959', 'All India N R Congress', '#3366CC', 'N Rangasamy', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/All_India_N.R._Congress.png/640px-All_India_N.R._Congress.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('46968f74-1159-4d42-9af6-5222e27a8dc5', 'Amma Makkal Munnetra Kazhagam (AMMK)', '#c00500', 'Vijay', 'TBD', 'https://images.seeklogo.com/logo-png/41/1/aiadmk-logo-png_seeklogo-411321.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('48a83629-1e5f-432d-8f90-675b893177e1', 'Apna Dal', '#009999', 'Anupriya Patel', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Apna_dal_Flag.svg/640px-Apna_dal_Flag.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('d0358335-ea94-4293-97f5-c8196786b658', 'Assam Gana Parishad', '#009933', 'Atul Bora', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Flag_of_Trinamool_Gana_Parishad.svg/640px-Flag_of_Trinamool_Gana_Parishad.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('2d514ea1-9733-4cec-abb7-287f34f36d7c', 'Bahujan Samaj Party', '#0033A0', 'Mayawati', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Bahujan_Samaj_Party_Flag.svg/640px-Bahujan_Samaj_Party_Flag.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('5503ffac-ff22-4bed-b7b5-88b0e58d83ad', 'Bharat Rashtra Samithi', '#FF69B4', 'K Chandrashekar Rao', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Flag_of_Bharat_Rashtra_Samithi_%28India_Nation_Council%29.png/640px-Flag_of_Bharat_Rashtra_Samithi_%28India_Nation_Council%29.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('8429928e-a9ab-4bfe-b836-b59444036688', 'Bharatiya Janata Party', '#FF9933', 'Narendra Modi', 'TBD', 'https://images.seeklogo.com/logo-png/44/1/bjp-logo-png_seeklogo-440196.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('84df28cd-e72e-4550-a4bb-eb9db19867d5', 'Biju Janata Dal', '#0066CC', 'Naveen Patnaik', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Biju_Janata_Dal_flag.svg/640px-Biju_Janata_Dal_flag.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('98493667-1b5f-4072-95b7-ccf9e1236c55', 'Bodoland Peoples Front', '#FF0000', 'Hagrama Mohilary', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Front_Nacional_Democratic_Bodoland.svg/640px-Front_Nacional_Democratic_Bodoland.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('9d63b879-4397-4a7e-bbd9-ed9d91e88968', 'Communist Party of India', '#FF0000', 'D Raja', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Communist_Party_of_India_%28Marxist%29_flag.svg/640px-Communist_Party_of_India_%28Marxist%29_flag.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('71831833-5d55-4ce5-abe7-678739dcf3d8', 'Communist Party of India Marxist', '#CC0000', 'Sitaram Yechury', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Communist_Party_of_India_%28Marxist%29_flag.svg/640px-Communist_Party_of_India_%28Marxist%29_flag.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('45e28ab3-93f7-43f5-b95a-243a2903efc7', 'Desiya Murpokku Dravida Kazhagam', '#000000', 'Vijayakanth', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Indian_Election_Symbol_Nagara.svg/640px-Indian_Election_Symbol_Nagara.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('4bdabcb3-ac2c-4b4b-a218-d7d66f64fd0d', 'Dravida Munnetra Kazhagam (DMK)', '#E31E24', 'M K Stalin', 'TBD', 'https://images.seeklogo.com/logo-png/41/1/dmk-logo-png_seeklogo-411320.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('17da5ec6-eef3-42fe-b7ef-419a1cdf4ad5', 'Goa Forward Party', '#FF6600', 'Vijai Sardesai', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Goa_Forward_Party_Flag.jpg/640px-Goa_Forward_Party_Flag.jpg', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('381d59ed-2623-4ae8-9072-c99ae52720a4', 'Haryana Jannayak Janta Party', '#FFFF00', 'Dushyant Chautala', 'TBD', 'https://tse4.mm.bing.net/th/id/OIP.RIb0dSdPNWPh2qB3JLGacAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('4e8df65e-ffb9-47eb-b828-f945c9dbab14', 'Hill State People Democratic Party', '#228B22', 'KP Pangniang', 'TBD', 'https://media.assettype.com/english-sentinelassam/import/h-upload/2022/03/23/327618-hspdp.webp?w=480&auto=format%2Ccompress&fit=max', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('9c6d7c03-3a48-4c3f-a0be-56d7135a5d52', 'Indian National Congress', '#19AAED', 'Mallikarjun Kharge', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Indian_National_Congress_Flag.svg/640px-Indian_National_Congress_Flag.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('ba119fe8-704d-45ed-a0aa-a8efe3da623a', 'Indian National Lok Dal', '#009933', 'Om Prakash Chautala', 'TBD', 'https://tse2.mm.bing.net/th/id/OIP.MMoytswwoZ4MnyEGBAlLkgAAAA?rs=1&pid=ImgDetMain&o=7&rm=3', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('638c676f-80e0-43e8-8b09-6303ba0acc24', 'Indian Union Muslim League', '#228B22', 'K M Kader Mohideen', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Flag_of_the_Indian_Union_Muslim_League.svg/640px-Flag_of_the_Indian_Union_Muslim_League.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('3d1dc59d-7f54-474b-8508-8c3a1bfbd006', 'Indiya Jananayaka Katchi (IJK)', '#c00500', 'Vijay', 'TBD', 'https://images.seeklogo.com/logo-png/44/1/bjp-logo-png_seeklogo-440196.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('a32cf4e3-040c-47a5-b09c-e249e0fb89c8', 'Jammu and Kashmir National Conference', '#CC0000', 'Farooq Abdullah', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Flag_of_Jammu_and_Kashmir_%281952-2019%29.svg/640px-Flag_of_Jammu_and_Kashmir_%281952-2019%29.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('4fa750bb-254c-4696-b0d6-6a109e8bd85a', 'Janasena Party', '#FF0000', 'Pawan Kalyan', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Jana_Sena_Party_Flag.png/640px-Jana_Sena_Party_Flag.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('6ebcb5f3-4679-4353-b12e-cc1e9ae31ebf', 'Janata Dal United', '#006400', 'Nitish Kumar', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Janata_Dal_%28United%29_Flag.svg/640px-Janata_Dal_%28United%29_Flag.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('722301ec-b82d-4030-b67c-7f69e500c30e', 'Jharkhand Mukti Morcha', '#228B22', 'Hemant Soren', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Jharkhand_Mukti_Morcha_logo.svg/640px-Jharkhand_Mukti_Morcha_logo.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('177f272e-43df-49cf-b38b-cd9c7da21915', 'Kerala Congress', '#33AA33', 'Jose K Mani', 'TBD', 'https://img.etimg.com/thumb/width-1200,height-1200,imgsize-7756,resizemode-75,msid-121000114/news/politics-and-nation/congress-rejigs-kerala-unit-with-eye-of-2026-polls-appoints-sunny-joseph-as-its-chief.jpg', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('aa6de201-518f-4b05-a3c6-51b65ef66e17', 'Kerala Congress Joseph', '#33AA33', 'P J Joseph', 'TBD', 'https://upload.wikimedia.org/wikipedia/en/2/22/Kerala_Congress_flag.svg', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('7b357f78-86a1-482f-8a3a-cbcf970a7788', 'Kerala Congress Mani', '#33AA33', 'Jose K Mani', 'TBD', 'https://upload.wikimedia.org/wikipedia/en/2/22/Kerala_Congress_flag.svg', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('d453fc61-e07c-4263-bd30-a7a9bdb941a6', 'Lok Janshakti Party', '#FFCC00', 'Chirag Paswan', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Lok_Janshakti_Party_Flag.svg/640px-Lok_Janshakti_Party_Flag.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('48bc2c5e-de0b-4cbe-af0e-2aee02f0f6ee', 'Maharashtra Navnirman Sena', '#FF9900', 'Raj Thackeray', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Flag_of_Maharashtra_Navnirman_Sena.svg/640px-Flag_of_Maharashtra_Navnirman_Sena.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('8834876e-d88f-406b-85db-f27b165d697b', 'Marumalarchi Dravida Munnetra Kazhagam (MDMK)', '#E31E24', 'M K Stalin', 'TBD', 'https://images.seeklogo.com/logo-png/41/1/dmk-logo-png_seeklogo-411320.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('58660fff-7b2e-46a4-8400-bed5831fcbbf', 'Mizo National Front', '#3366CC', 'Zoramthanga', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/1/18/In_mnf.gif', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('4c3fc4aa-28bd-4385-a231-cbd9914b99db', 'Naam Tamilar Katchi', '#CC0000', 'Seeman', 'TBD', 'https://imagesvs.oneindia.com/politician-profiles/image/parties/party-flags/naam-tamilar-katchi-flag-912.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('6d7fbc94-72ae-4348-8475-096e43bde5e8', 'National People Party', '#FFAA00', 'Conrad Sangma', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/National_Peoples_Party_Flag.jpg/640px-National_Peoples_Party_Flag.jpg', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('1356e549-7eea-4575-876b-0aed1caf21e0', 'Nationalist Congress Party', '#008000', 'Sharad Pawar', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Ncp-logo.png/640px-Ncp-logo.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('55070de8-3d03-4dcb-98bc-d2ab0d67bf6a', 'Pattali Makkal Katchi', '#FF0000', 'Anbumani Ramadoss', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Pmk_flag.jpg/640px-Pmk_flag.jpg', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('c2e070fc-edf2-485c-8823-052f87a88384', 'People Democratic Party', '#008080', 'Mehbooba Mufti', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Logo_of_Democratic_Party_For_the_People.svg/640px-Logo_of_Democratic_Party_For_the_People.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('b720d1a7-8e53-4b39-a512-994d0117623a', 'Rashtriya Janata Dal', '#008000', 'Lalu Prasad Yadav', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/RJD_Flag.svg/640px-RJD_Flag.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('ab0a410b-f37d-4ef6-976a-d60a74895802', 'Rashtriya Lok Dal', '#006600', 'Jayant Chaudhary', 'TBD', 'https://tse4.mm.bing.net/th/id/OIP.1TQYNg7EyNKW_4L-J6abxAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('bd17d7f9-d29d-4850-834e-9b115835b0b4', 'Revolutionary Marxist Party', '#CC0000', 'TK Ramakrishnan', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Revolutionary-Communists-of-America-Red-Logo.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('a35aceed-749e-4741-8d9f-1a40df5fd279', 'Revolutionary Socialist Party', '#FF0000', 'Manoj Bhattacharya', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/RSP_Political_Party_Logo.png/640px-RSP_Political_Party_Logo.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('a861faa7-df30-4c20-8b65-ec3eaa3b6683', 'Samajwadi Party', '#D60000', 'Akhilesh Yadav', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Samajwadi_Party.png/640px-Samajwadi_Party.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('2b648a1f-22e1-486a-ab51-9d8546fd9d87', 'Shiromani Akali Dal', '#000080', 'Sukhbir Singh Badal', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Shrimoani_akali_dal_Amritsar.jpg/640px-Shrimoani_akali_dal_Amritsar.jpg', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('05c6f22d-dd50-468c-98af-092d0d770b8a', 'Shiv Sena', '#FF7F00', 'Uddhav Thackeray', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Shiv_Sena_flag.jpg/640px-Shiv_Sena_flag.jpg', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('8f770c9c-e0d2-4c9e-9baa-24339aba2ef5', 'Sikkim Democratic Front', '#00AEEF', 'Pawan Kumar Chamling', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Sikkim-Democratic-Front-flag.svg/640px-Sikkim-Democratic-Front-flag.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('4c3a6070-f4ed-45a5-add3-897f97a65cbb', 'Sikkim Krantikari Morcha', '#FF0000', 'Prem Singh Tamang', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Sikkim_Krantikari_Morcha_flag.svg/640px-Sikkim_Krantikari_Morcha_flag.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('15bd812f-51da-41fd-b1e4-80d52b789100', 'Tamil Maanila Congress (moopanar) (TMC(M))', '#c00500', 'Vijay', 'TBD', 'https://images.seeklogo.com/logo-png/44/1/bjp-logo-png_seeklogo-440196.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('544e531f-e2ac-4274-9305-c35164c1bd93', 'Tamilaga Vettri Kazhagam', '#c00500', 'Vijay', 'TBD', 'https://storage.googleapis.com/inv-images/party-logos/tvk.jpg', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('8d25402f-c02b-415f-9e86-51bd8f73b518', 'Telangana Rashtra Samithi', '#FF69B4', 'K Chandrashekar Rao', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Flag_of_Bharat_Rashtra_Samithi_%28India_Nation_Council%29.svg/640px-Flag_of_Bharat_Rashtra_Samithi_%28India_Nation_Council%29.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('56251275-90f3-4bc5-a036-63684847776f', 'Telugu Desam Party', '#FFFF00', 'N Chandrababu Naidu', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Telugu_Desam_Party_Flag.png/640px-Telugu_Desam_Party_Flag.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('7872f23e-b122-4941-b8b8-3d5e840af69b', 'Tipra Motha Party', '#800080', 'Pradyot Bikram Manikya', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Tipra_Motha_Party_Flag.jpg/640px-Tipra_Motha_Party_Flag.jpg', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('96b2f065-384d-4fe2-92e1-87d5f0a4d24a', 'Trinamool Congress', '#009933', 'Mamata Banerjee', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/All_India_Trinamool_Congress_flag_%283%29.svg/640px-All_India_Trinamool_Congress_flag_%283%29.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('80bd6387-84ca-46a3-9542-b8d6da002567', 'Tripura Indigenous Progressive Regional Alliance', '#FFCC00', 'Motha Leader', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/TIPRA_flag.jpg/640px-TIPRA_flag.jpg', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('570f4dcf-d4b7-4438-835f-838038ccaf36', 'United Democratic Party', '#336699', 'Metbah Lyngdoh', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/US_Democratic_Party_Logo.svg/640px-US_Democratic_Party_Logo.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('224e82c8-da26-49ee-8536-c10183edf71a', 'United Peoples Party Liberal', '#0099CC', 'Pramod Boro', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Flag_of_Taiwanese_People%27s_Party_%281929-1931%29.svg/640px-Flag_of_Taiwanese_People%27s_Party_%281929-1931%29.svg.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('2ece8d6c-0ef7-4f6f-91f1-1d553482a28f', 'Viduthalai Chiruthaigal Katchi', '#0000FF', 'Thol Thirumavalavan', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Viduthalai_Chiruthaigal_Katchi_banner.png/640px-Viduthalai_Chiruthaigal_Katchi_banner.png', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('2cb3b7e3-2d3e-471b-996e-3c958b41f6af', 'YSR Congress Party', '#1E90FF', 'Y S Jagan Mohan Reddy', 'TBD', 'https://4.bp.blogspot.com/-ELaPNYlWzDQ/TXvaYIjau0I/AAAAAAAAKhE/E3OhtfWqpNM/s1600/ysr_flag.jpg', '4b389655-3e65-4771-869d-2209efa6cf61', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('b31cbcc4-4dcd-4cea-9b03-220985836565', 'Democratic Party', '#0015BC', 'Joe Biden', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Democratic_Disc.svg/640px-Democratic_Disc.svg.png', '09d48d7c-6327-4537-902b-7154f69f87be', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('c1fd611a-dbfc-4de9-8a31-343742ae1e67', 'Green Party', '#00A95C', 'Jill Stein', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Flag_of_the_Green_Party_of_the_United_States_%28proposal%29.svg/640px-Flag_of_the_Green_Party_of_the_United_States_%28proposal%29.svg.png', '09d48d7c-6327-4537-902b-7154f69f87be', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('89043b54-7fe1-4b41-af5e-c242147c73a0', 'Libertarian Party', '#FDBB30', 'Angela McArdle', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/LP_Election_Symbol.jpg/640px-LP_Election_Symbol.jpg', '09d48d7c-6327-4537-902b-7154f69f87be', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('18f58681-116a-46e3-ae3f-8913332438fa', 'Republican Party', '#E9141D', 'Donald Trump', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Republicanlogo.svg', '09d48d7c-6327-4537-902b-7154f69f87be', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('e85ec37d-e562-4ed8-bc60-bd6053eb8309', 'Conservative Party', '#0087DC', 'Rishi Sunak', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Conservative_Party_of_Canada_symbol.svg/640px-Conservative_Party_of_Canada_symbol.svg.png', '67377e60-c007-477d-92fa-c6e01294bbdd', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('df1389f9-681a-4a92-9f55-be2be059dfbd', 'Labour Party', '#E4003B', 'Keir Starmer', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/British_Labour_Party_Torch_Quill_Shovel.png/640px-British_Labour_Party_Torch_Quill_Shovel.png', '67377e60-c007-477d-92fa-c6e01294bbdd', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('8e65bd54-dc8b-48d9-b19c-fa7338b69214', 'Liberal Democrats', '#FAA61A', 'Ed Davey', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Liberal_Democrats_Example_Icon.png/640px-Liberal_Democrats_Example_Icon.png', '67377e60-c007-477d-92fa-c6e01294bbdd', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('70cf9be9-52f2-41b8-9194-0186f4e7fbb6', 'Scottish National Party', '#FFF95D', 'Humza Yousaf', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Scottish_National_Party_Logo.svg/640px-Scottish_National_Party_Logo.svg.png', '67377e60-c007-477d-92fa-c6e01294bbdd', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('cf39bc8e-3186-4af1-b759-f3a3a1980b93', 'Alliance 90 The Greens', '#1AA037', 'Ricarda Lang', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/B%C3%BCndnis_90_-_Die_Gr%C3%BCnen_Logo.svg/640px-B%C3%BCndnis_90_-_Die_Gr%C3%BCnen_Logo.svg.png', '87f117f0-217b-4e5d-a337-bf23b9b0f8da', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('5f0ee3f9-df25-4b06-9c78-f0a139743bd2', 'Christian Democratic Union', '#000000', 'Friedrich Merz', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/CDU_Logo_2023.svg/640px-CDU_Logo_2023.svg.png', '87f117f0-217b-4e5d-a337-bf23b9b0f8da', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('3e42fc13-845d-43c8-8dc4-37274c309b1a', 'Free Democratic Party', '#FFED00', 'Christian Lindner', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Free_Democratic_Party_-_Liberia_1997.svg/640px-Free_Democratic_Party_-_Liberia_1997.svg.png', '87f117f0-217b-4e5d-a337-bf23b9b0f8da', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('8a280415-dff8-407d-ac7a-bc6f695801fc', 'Social Democratic Party of Germany', '#E3000F', 'Olaf Scholz', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Sozialdemokratische_Partei_Deutschlands%2C_Logo_1969-1982.png', '87f117f0-217b-4e5d-a337-bf23b9b0f8da', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('7f4feb03-a04a-4963-8439-ce890850f1f0', 'National Rally', '#002395', 'Jordan Bardella', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Rassemblement_national_logo.svg', 'e2336c2c-fd9b-4c5a-a42e-d7f0a53b713f', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('1e2a4494-fdb7-414f-89d7-af0976501216', 'Renaissance', '#FFD700', 'Emmanuel Macron', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Renaissance-logotype-officiel.svg/640px-Renaissance-logotype-officiel.svg.png', 'e2336c2c-fd9b-4c5a-a42e-d7f0a53b713f', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('179c8dbb-857d-4172-a4d7-4fcaa0c4fae1', 'Socialist Party', '#E30613', 'Olivier Faure', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Socialist_Party_%28Ireland%29_logo_infobox.png', 'e2336c2c-fd9b-4c5a-a42e-d7f0a53b713f', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('b130503d-752a-4fe0-bac4-446bdce22237', 'Brothers of Italy', '#003399', 'Giorgia Meloni', 'TBD', 'https://tse1.mm.bing.net/th/id/OIP.iG9CaiHfEBi8gi4uPBapFgHaHV?rs=1&pid=ImgDetMain&o=7&rm=3', 'c7654f04-9fc2-435e-a7ee-2247032989ad', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('95d162bc-b325-425a-be03-07302b2a94be', 'Democratic Party', '#009933', 'Elly Schlein', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Democratic_Disc.svg/640px-Democratic_Disc.svg.png', 'c7654f04-9fc2-435e-a7ee-2247032989ad', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('3112378f-0462-4034-9430-475bd2b98082', 'People Party', '#0056A3', 'Alberto Nunez Feijoo', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/9/94/Pakistan_Peoples_Party_Flag_with_arrow.png', 'b22bdc92-6528-4038-9e03-5d3c3d7f605b', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('b518ce47-3475-4b99-828c-f3aa5ddcd59a', 'Spanish Socialist Workers Party', '#E3001B', 'Pedro Sanchez', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Spanish_Socialist_Workers%27_Party_%28PSOE%29_LOGO.png/640px-Spanish_Socialist_Workers%27_Party_%28PSOE%29_LOGO.png', 'b22bdc92-6528-4038-9e03-5d3c3d7f605b', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('f955f4cb-2828-4316-a448-8a63e3f0b310', 'Conservative Party of Canada', '#002395', 'Pierre Poilievre', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Logo_of_the_Conservative_Party_of_Canada_%282023%E2%80%93present%29.svg/640px-Logo_of_the_Conservative_Party_of_Canada_%282023%E2%80%93present%29.svg.png', '80596187-2cbc-4d90-9bc8-1304eeb27bf4', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('7e754222-c933-4ace-8a63-abc47407726e', 'Liberal Party of Canada', '#D71920', 'Justin Trudeau', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Liberal_Party_of_Canada_red_symbol.svg/640px-Liberal_Party_of_Canada_red_symbol.svg.png', '80596187-2cbc-4d90-9bc8-1304eeb27bf4', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('7436aca6-f4a0-4f55-a2ce-234c08f28f8d', 'Liberal Party Brazil', '#005BBB', 'Valdemar Costa Neto', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Logo_do_Partido_Liberal_%281995%29.svg/640px-Logo_do_Partido_Liberal_%281995%29.svg.png', 'c21c5803-793f-47c0-b7c8-21ff5fd20de3', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('1be344e3-b9dd-4082-a21f-ab62c062a1ff', 'Workers Party', '#CC0000', 'Luiz Inacio Lula da Silva', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Star_of_the_Workers%27_Party_of_North_Korea.svg/640px-Star_of_the_Workers%27_Party_of_North_Korea.svg.png', 'c21c5803-793f-47c0-b7c8-21ff5fd20de3', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('0e970274-81e9-4b5a-9eb4-35342fb6783c', 'Constitutional Democratic Party', '#007FFF', 'Kenta Izumi', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Constitutional_Democratic_Party_of_Japan_%28Rikken%29.svg/640px-Constitutional_Democratic_Party_of_Japan_%28Rikken%29.svg.png', 'e5882ea4-ebfa-4e3c-b8b7-d8988abfdda1', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('de84fec5-b90c-4120-bdd9-1fb3af02bc45', 'Liberal Democratic Party', '#003399', 'Fumio Kishida', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Liberal_Democratic_Party_%28Japan%29_Flag.svg/640px-Liberal_Democratic_Party_%28Japan%29_Flag.svg.png', 'e5882ea4-ebfa-4e3c-b8b7-d8988abfdda1', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('0b591ac9-b682-406e-a021-fc384c74242c', 'Democratic Party of Korea', '#005BAC', 'Lee Jae-myung', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Democratic_Party_of_South_Korea_banner.svg/640px-Democratic_Party_of_South_Korea_banner.svg.png', '9b9ed1f9-2ce9-4c54-a9bb-3f1f43525621', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('637d2940-0467-4ed3-a234-80e8fc7d8445', 'People Power Party', '#E61E2A', 'Han Dong-hoon', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Flag_of_People_Power_Party_of_Korea.svg/640px-Flag_of_People_Power_Party_of_Korea.svg.png', '9b9ed1f9-2ce9-4c54-a9bb-3f1f43525621', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('1f5e75ef-6da2-4981-a030-631170588113', 'Pakistan Muslim League N', '#006600', 'Shehbaz Sharif', 'TBD', 'https://upload.wikimedia.org/wikipedia/en/5/5f/PMLN_flag.svg', 'bec122f5-638b-49a8-bf45-cb33a8b0aada', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('664efb19-23ab-4e7c-a413-3b98742a38f2', 'Pakistan Peoples Party', '#000000', 'Bilawal Bhutto Zardari', 'TBD', 'https://upload.wikimedia.org/wikipedia/en/3/33/PPP_flag.svg', 'bec122f5-638b-49a8-bf45-cb33a8b0aada', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('11e33b7f-ab57-4bac-b8e1-a8fb4c457d90', 'Pakistan Tehreek-e-Insaf', '#007A3D', 'Imran Khan', 'TBD', 'https://upload.wikimedia.org/wikipedia/en/1/1c/PTI_flag.svg', 'bec122f5-638b-49a8-bf45-cb33a8b0aada', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('3a7b3503-e0f2-4a87-ab6f-a83acccf310d', 'Awami League', '#006A4E', 'Sheikh Hasina', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE%E0%A6%A6%E0%A7%87%E0%A6%B6_%E0%A6%86%E0%A6%93%E0%A6%AF%E0%A6%BC%E0%A6%BE%E0%A6%AE%E0%A7%80_%E0%A6%B2%E0%A7%80%E0%A6%97%E0%A7%87%E0%A6%B0_%E0%A6%AC%E0%A', '1b2803b9-669c-41ee-97f6-5f064c9b8637', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('1f96632f-fab8-4e05-93bb-2cc9618e14e9', 'Bangladesh Nationalist Party', '#006600', 'Khaleda Zia', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Flag_of_the_Bangladesh_Nationalist_Party.svg/640px-Flag_of_the_Bangladesh_Nationalist_Party.svg.png', '1b2803b9-669c-41ee-97f6-5f064c9b8637', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('1a080137-da39-43ad-b3ea-8cd22c86b68f', 'Sri Lanka Podujana Peramuna', '#8B0000', 'Mahinda Rajapaksa', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Sri_Lanka_Podujana_Peramuna_election_symbol.svg/640px-Sri_Lanka_Podujana_Peramuna_election_symbol.svg.png', '760e5375-8a33-45d9-bbf7-522891f4a007', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('b63c04c1-ce07-4ae3-b652-740e3a1da511', 'United National Party', '#00AEEF', 'Ranil Wickremesinghe', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Election_Symbol_United_National_Party_Sri_Lanka.png', '760e5375-8a33-45d9-bbf7-522891f4a007', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('c2739a73-1558-458c-87c7-33aecebb7a13', 'Communist Party of Nepal UML', '#CC0000', 'K P Sharma Oli', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Flag_of_the_CPN-UML_%282021-%29.svg/640px-Flag_of_the_CPN-UML_%282021-%29.svg.png', '9f2604d9-19c4-4052-be42-3c39924db1e2', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('717973d4-3678-4869-92ce-c5be2c2be7ce', 'Nepali Congress', '#1E90FF', 'Sher Bahadur Deuba', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Nepali_Congress_flag_edited.svg/640px-Nepali_Congress_flag_edited.svg.png', '9f2604d9-19c4-4052-be42-3c39924db1e2', 'system');
insert into party_master (id,	name,	color,	leader_name,	contestant_name,	logo_url,	country_id,	created_by) values ('8c5fe417-950b-4dcf-bda6-c65d994482f7', 'National Regeneration Movement', '#8B0000', 'Andres Manuel Lopez Obrador', 'TBD', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Morena_logo_%28Mexico%29.svg/640px-Morena_logo_%28Mexico%29.svg.png', '078a0e97-a069-42ef-a81a-a8d6a76483fe', 'system');

*/