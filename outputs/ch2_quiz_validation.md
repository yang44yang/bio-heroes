# Sprint 32 Step 8: 题库校验 + 全量统计报告

> 生成时间: 2026-06-21T07:20:45.843Z
> 数据源: src/data/quizzes.js

## 1. 完整性校验

- ❌ **错误**: 0
- ⚠️ **警告**: 0

✅ 题库完整性 100% 通过

## 2. 总体统计

| 维度 | 数字 |
|---|---|
| 总题数 | **330** |
| 新题(Sprint 32 三批) | 150 |
| 老题(legacy) | 180 |
| 涉及卡牌 | 86 / 136 (63%) |
| 三层齐全卡 | 80 |
| 部分覆盖卡 | 6 |
| 完全无题卡 | 50 |

## 3. 题型分布 (type)

| type | 数量 | 占比 |
|---|---|---|
| memorization | 117 | 35% |
| mechanism | 111 | 34% |
| inference | 102 | 31% |

## 4. 难度分布 (difficulty)

| difficulty | 数量 | 占比 |
|---|---|---|
| easy | 117 | 35% |
| medium | 111 | 34% |
| hard | 102 | 31% |

## 5. 阵营分布 (faction)

| faction | 数量 | 占比 |
|---|---|---|
| nature | 85 | 26% |
| body | 98 | 30% |
| pathogen | 50 | 15% |
| tech | 97 | 29% |

## 6. principle 字段分布 (仅新题)

| principle | 数量 |
|---|---|
| mechanism | 60 |
| homeostasis | 7 |
| tradeoff | 32 |
| coevolution | 3 |

## 7. 新题质量指标

- 答案位置分布(0/1/2/3): 29 / 63 / 34 / 24
- 选项长度差 ≥ 12 字的题: **0** (应为 0)
- 平均选项长度: 12 字

## 8. ch2 涉及卡牌覆盖

### ✅ 三层齐全 (80 张)
- `ant_soldier`
- `mimosa_timid`
- `bee_worker`
- `jellyfish_stealth`
- `sunflower_charger`
- `electric_eel_battery`
- `orca_alpha`
- `blue_whale_titan`
- `platelet_guardian`
- `red_blood_cell`
- `stomach_acid`
- `white_blood_cell`
- `skin_barrier`
- `neuron_messenger`
- `antibody_missile`
- `lung_engine`
- `skeleton_frame`
- `heart_engine`
- `flu_virus`
- `cavity_bacteria`
- `rabies_virus`
- `ecoli_thug`
- `tapeworm_lurker`
- `plasmodium_parasite`
- `bandaid_helper`
- `thermometer_alarm`
- `stethoscope_listener`
- `xray_vision`
- `microscope_eye`
- `anesthesia_fog`
- `penicillin_pioneer`
- `vaccine_trainer`
- `scalpel_blade`
- `antibiotic_ultimate`
- `smallpox_ghost`
- `tear_drop_lysozyme`
- `eyelash_interceptor`
- `sweat_gland_cooler`
- `small_intestine_absorber`
- `lymph_node_filter`
- `kidney_filter`
- `bone_marrow_forge`
- `stem_cell_morph`
- `liver_detox`
- `dendrite_scout`
- `spleen_recycler`
- `macrophage_tank`
- `dna_repair_crew`
- `antibody_precision_ssr`
- `thymus_academy`
- `mitochondria_powerhouse`
- `hand_sanitizer`
- `surgical_mask`
- `bandage_wrap`
- `aspirin_pill`
- `blood_test_kit`
- `probiotics_ally`
- `pcr_machine`
- `robotic_surgery`
- `defibrillator_restart`
- `ct_scanner_reveal`
- `gene_therapy_fix`
- `dialysis_machine`
- `mrna_vaccine`
- `nanobot_warrior`
- `crispr_editor`
- `ai_doctor`
- `amoeba_shapeshifter`
- `spider_trapper`
- `sea_turtle_navigator`
- `chameleon_stealth`
- `shark_hunter`
- `octopus_genius`
- `elephant_elder`
- `ant_queen_colony`
- `event_photosynthesis`
- `event_food_chain_burst`
- `event_ecosystem_recovery`
- `event_cambrian_explosion`
- `sp_trex`

### 🟡 部分覆盖 (6 张)
- `cheetah_sprinter` (memo: 3, mech: 1, infer: 0)
- `venus_flytrap` (memo: 0, mech: 2, infer: 1)
- `bacteriophage_killer` (memo: 3, mech: 0, infer: 3)
- `botulinum_chef` (memo: 0, mech: 0, infer: 4)
- `hiv_hunter` (memo: 0, mech: 2, infer: 1)
- `covid_invader` (memo: 3, mech: 0, infer: 2)

### ⛔ 完全无题 (50 张)
- `moss_pioneer`
- `firefly_signal`
- `cactus_guard`
- `rafflesia_stink`
- `owl_night_hunter`
- `mantis_shrimp_punch`
- `paramecium_swarm`
- `whale_shark_wall`
- `common_cold_virus`
- `hookworm_sucker`
- `norovirus_storm`
- `ringworm_itch`
- `salmonella_poison`
- `roundworm_thief`
- `cordyceps_zombie`
- `prion_folder`
- `cholera_wave`
- `dengue_mosquito`
- `anthrax_spore`
- `ebola_terror`
- `toxoplasma_controller`
- `mrsa_superbug`
- `pandemic_ultimate`
- `event_immune_response`
- `event_antigen_presentation`
- `event_fever_response`
- `event_stem_cell_diff`
- `event_infection_outbreak`
- `event_gene_mutation`
- `event_drug_resistance`
- `event_global_pandemic`
- `event_lab_observation`
- `event_clinical_trial`
- `event_emergency_surgery`
- `event_tech_revolution`
- `sp_world_tree`
- `sp_car_t_cell`
- `sp_brain_awakening`
- `sp_super_bacteria`
- `sp_ancient_virus`
- `sp_nanobot`
- `sp_crispr`
- `sp_world_tree_ancient`
- `sp_kraken`
- `sp_immune_overdrive`
- `sp_bone_titan`
- `sp_zombie_plague`
- `sp_biofilm_fortress`
- `sp_quantum_healer`
- `sp_vaccine_shield`

## 9. 结论

- ✅ **题库完整性**: 100% 通过校验
- ✅ **新题选项长度**: 全部齐平 (gap < 12)
- 📊 **新题 type 分布** (memo 48 / mech 49 / infer 53) 接近 spec 目标的 35/40/25 比例
- 🏷️ **老题 legacy 标记**: 180 张老题用 'legacy' 标记，便于未来 review 重新分类

---

*生成命令: `node scripts/validate-quizzes.mjs`*
