select * from survey.temp_votes;
select * from survey.surveys;

select * from survey.party;

select * from survey.user;
SELECT * FROM survey.country;

SELECT * FROM survey.party_master;
select count(*) from survey.party_master;

SELECT count(*), country_id, country.name FROM survey.party_master 
join country on country.id = party_master.country_id
group by country_id;
-- truncate table survey.party_master 
