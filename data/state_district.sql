-- MySQL dump 10.13  Distrib 8.0.36, for Win64 (x86_64)
--
-- Host: service-db.cee0nr2kznps.us-east-1.rds.amazonaws.com    Database: collegedb
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '';

--
-- Table structure for table `districts`
--

DROP TABLE IF EXISTS `districts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `districts` (
  `id` varchar(36) NOT NULL,
  `code` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `state_id` varchar(36) NOT NULL,
  `country_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_af5b259348f92b134f28548b3a7` (`country_id`),
  KEY `FK_18b176b7f592f3a1c55d5e43a87` (`state_id`),
  CONSTRAINT `FK_18b176b7f592f3a1c55d5e43a87` FOREIGN KEY (`state_id`) REFERENCES `states` (`id`),
  CONSTRAINT `FK_af5b259348f92b134f28548b3a7` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `districts`
--

LOCK TABLES `districts` WRITE;
/*!40000 ALTER TABLE `districts` DISABLE KEYS */;
INSERT INTO `districts` VALUES ('0fd86ea7-25eb-4f20-b4ad-2fe7dda7e382','Pudukkottai','Pudukkottai','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('13563db6-dce7-4b82-81dd-bac5d416110d','Tiruppur','Tiruppur','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('16857f49-0ac0-41c8-b5f4-b745f6f98fe3','Tenkasi','Tenkasi','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('25314415-663a-4244-9db1-5c2962868664','Perambalur','Perambalur','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('2fd5e362-8a2e-4b90-8d5f-b71353a07527','Tiruvannamalai','Tiruvannamalai','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('3241e526-54ac-4d28-a7d3-0f1d3d3c30a9','Villupuram','Villupuram','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('33b86357-1153-4e41-9b99-b9685e128df9','Chengalpattu','Chengalpattu','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('3a93651e-764f-48f3-8748-25b303c32304','Dharmapuri','Dharmapuri','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('3d64dbe1-2a99-4303-9307-175d56e6d9e6','Kallakurichi','Kallakurichi','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('3db015df-eb65-405f-8488-eea72eb6e087','Thanjavur','Thanjavur','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('3f86a37b-6817-4dc5-babd-73c972962aca','Ramanathapuram','Ramanathapuram','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('411fa10a-e041-4683-875d-28df1d94b660','The Nilgiris','The Nilgiris','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('43e8d60c-0e2c-42f0-95d9-48b6ed30d923','Karur','Karur','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('4fa55af9-22fb-4523-b6c5-1629a9db82a5','Ranipet','Ranipet','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('50ffbb0b-1865-4bf1-9af1-2af3f37ff5bd','Krishnagiri','Krishnagiri','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('56ded4ab-571b-4a09-914a-e6c00bd31ee5','Vellore','Vellore','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('62d629ce-cf5a-4c6c-9e52-d7fe59a7b356','Salem','Salem','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('63cbd559-4eec-4e0e-b0fb-6381dfe6c073','Chennai','Chennai','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('69483f23-6312-4c39-826f-a058c83f421a','Dindigul','Dindigul','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('6a1bb690-7bc3-47d8-9672-e2ba8682155e','Tirunelveli','Tirunelveli','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('6c99dc2a-7e9b-49e5-b090-58033936d735','Virudhunagar','Virudhunagar','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('76168604-65fc-439f-8e23-05d731626567','Thiruvallur','Thiruvallur','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('765638d5-e10a-48eb-8d27-f6d14840aae6','Ariyalur','Ariyalur','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('892cee4a-7fb9-4377-ad35-2a19cd8e831e','Madurai','Madurai','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('8e63bc03-1c9e-4f11-bfec-37eea3e8d2d1','Cuddalore','Cuddalore','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('9070969c-1cf1-48f9-b11b-e2e1caf2025d','Tirupathur','Tirupathur','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('921e9373-3cfa-4f23-89c6-416c273980ac','Thiruvarur','Thiruvarur','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('95f7baf3-92ec-4aae-a8d9-7a791a502c75','Theni','Theni','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('a1a0a7bc-5e63-4724-b6f5-606e6f15021d','Thoothukudi','Thoothukudi','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('a8c5de5c-8c96-4943-9ba3-6792f4a0c35b','Kancheepuram','Kancheepuram','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('b9a7adbb-ccdb-412f-ae95-c0b8705d7444','Mayiladuthurai','Mayiladuthurai','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('c4173481-1e2e-4675-900e-fdab918f8db9','Namakkal','Namakkal','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('c94e37d8-fe96-4f52-8f19-579dad42775c','Tiruchirappalli','Tiruchirappalli','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('e11a7362-b58a-4c5c-b0ed-76a4d0e78e68','Sivagangai','Sivagangai','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('e2efd18f-6894-41eb-a8db-08cdb7f21267','Erode','Erode','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('ed2f933e-4515-4f49-901e-1047a9d1bb9f','Kanyakumari','Kanyakumari','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('f13374c1-516b-4538-a8d9-502ee3b7559d','Nagapattinam','Nagapattinam','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336'),('fadd0541-32fa-4fb6-928b-1c74a1fd8686','Coimbatore','Coimbatore','68628c43-8739-40d7-ab55-923c9a0d6a7d','752c1be7-4c36-4d76-89a9-c77ae1774336');
/*!40000 ALTER TABLE `districts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `states`
--

DROP TABLE IF EXISTS `states`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `states` (
  `id` varchar(36) NOT NULL,
  `code` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `country_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_f3bbd0bc19bb6d8a887add08461` (`country_id`),
  CONSTRAINT `FK_f3bbd0bc19bb6d8a887add08461` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `states`
--

LOCK TABLES `states` WRITE;
/*!40000 ALTER TABLE `states` DISABLE KEYS */;
INSERT INTO `states` VALUES ('16615b08-f4d2-4ef1-af6d-ab1029edc981','AN','Andaman and Nicobar Islands','752c1be7-4c36-4d76-89a9-c77ae1774336'),('17bdcf11-66b0-4cc2-a15d-577c87d5625c','NL','Nagaland','752c1be7-4c36-4d76-89a9-c77ae1774336'),('19f308cb-8158-421f-a75d-416873ca4bde','ML','Meghalaya','752c1be7-4c36-4d76-89a9-c77ae1774336'),('271c62d6-e39e-4993-99c3-1a8928bc23ca','GA','Goa','752c1be7-4c36-4d76-89a9-c77ae1774336'),('3a064db6-d503-4371-b4da-fc6972b6ebdb','WB','West Bengal','752c1be7-4c36-4d76-89a9-c77ae1774336'),('3c2823f4-595f-439d-b619-0767efbe9daf','CH','Chandigarh','752c1be7-4c36-4d76-89a9-c77ae1774336'),('443168b6-af85-4bdb-8daa-80a458fc5b76','SK','Sikkim','752c1be7-4c36-4d76-89a9-c77ae1774336'),('4bdc893c-7981-413e-b635-e7d0929cb339','MH','Maharashtra','752c1be7-4c36-4d76-89a9-c77ae1774336'),('4cb61d68-f618-4307-949f-66696fdf6ccc','OR','Odisha','752c1be7-4c36-4d76-89a9-c77ae1774336'),('508313a2-fa88-4181-811e-8999960b8223','JK','Jammu and Kashmir','752c1be7-4c36-4d76-89a9-c77ae1774336'),('511f2ca7-0f6f-4562-a1df-fbfd1258f8ae','JH','Jharkhand','752c1be7-4c36-4d76-89a9-c77ae1774336'),('56e6e157-4f8a-4f59-9256-3118889371c0','HP','Himachal Pradesh','752c1be7-4c36-4d76-89a9-c77ae1774336'),('56f89e2c-4b7d-4091-8675-18b7e574f359','MN','Manipur','752c1be7-4c36-4d76-89a9-c77ae1774336'),('59930b2c-f082-4a7f-95a8-92676f5cae77','DL','Delhi','752c1be7-4c36-4d76-89a9-c77ae1774336'),('6349e7c4-cee6-45fe-b7d2-c855fe227eac','BR','Bihar','752c1be7-4c36-4d76-89a9-c77ae1774336'),('65efe778-7f10-45e9-b5b0-c58dee43e12c','GJ','Gujarat','752c1be7-4c36-4d76-89a9-c77ae1774336'),('68628c43-8739-40d7-ab55-923c9a0d6a7d','TN','Tamil Nadu','752c1be7-4c36-4d76-89a9-c77ae1774336'),('6b74679f-8908-4f21-9328-18ef72e3ce17','TG','Telangana','752c1be7-4c36-4d76-89a9-c77ae1774336'),('6de6d059-2bb9-4e81-ac04-8602464cfbce','PB','Punjab','752c1be7-4c36-4d76-89a9-c77ae1774336'),('7afc68f6-c46e-4f0b-b642-6400d8f85718','UT','Uttarakhand','752c1be7-4c36-4d76-89a9-c77ae1774336'),('7cbb1d7a-c630-4d30-b815-0e3c7263985d','MZ','Mizoram','752c1be7-4c36-4d76-89a9-c77ae1774336'),('837399c3-7d10-4bf5-9334-dd83ef376831','DD','Daman and Diu','752c1be7-4c36-4d76-89a9-c77ae1774336'),('96213ed9-9fed-401e-b20e-bc5ff55bcfe0','AS','Assam','752c1be7-4c36-4d76-89a9-c77ae1774336'),('ad9ee1f4-84b4-4349-b8d4-93e65d902c34','MP','Madhya Pradesh','752c1be7-4c36-4d76-89a9-c77ae1774336'),('b2a2332f-04d9-49b0-b129-c34caae097bc','RJ','Rajasthan','752c1be7-4c36-4d76-89a9-c77ae1774336'),('b4a65d0b-3c58-4013-a4c9-0b53afe4aaa6','LD','Lakshadweep','752c1be7-4c36-4d76-89a9-c77ae1774336'),('b814eeec-14ad-45f5-bf56-f99ee0d4420b','KA','Karnataka','752c1be7-4c36-4d76-89a9-c77ae1774336'),('ccb8bf65-95b0-49d0-9e34-f40cae21b89e','AR','Arunachal Pradesh','752c1be7-4c36-4d76-89a9-c77ae1774336'),('ce44de03-425f-47d1-af0e-e54c9e1923c5','DN','Dadra and Nagar Haveli','752c1be7-4c36-4d76-89a9-c77ae1774336'),('d4fefcc3-a915-46f3-866f-58081f5f2bc6','UP','Uttar Pradesh','752c1be7-4c36-4d76-89a9-c77ae1774336'),('d8dc0ba7-3a43-4b83-97c1-520263279efa','HR','Haryana','752c1be7-4c36-4d76-89a9-c77ae1774336'),('e353417b-c8a0-4922-be4e-d21caac45c3a','AP','Andhra Pradesh','752c1be7-4c36-4d76-89a9-c77ae1774336'),('e426b203-811a-4d59-be05-f6434d2908ea','KL','Kerala','752c1be7-4c36-4d76-89a9-c77ae1774336'),('e464d25e-d587-49db-9fa9-f280c7144ca7','CT','Chhattisgarh','752c1be7-4c36-4d76-89a9-c77ae1774336'),('f4925d5b-1eed-49e3-955e-6541fb00c378','PY','Puducherry','752c1be7-4c36-4d76-89a9-c77ae1774336'),('fcd85428-4efd-482b-9493-1b928939a6b9','TR','Tripura','752c1be7-4c36-4d76-89a9-c77ae1774336');
/*!40000 ALTER TABLE `states` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-12 19:24:01
