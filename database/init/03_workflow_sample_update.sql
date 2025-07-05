-- ワークフロー定義のgraphJsonを詳細化するアップデートスクリプト
-- React Flowビルダーと完全互換のデータ構造に更新

-- 請求書3段階承認ワークフローのgraphJsonを更新
UPDATE workflow_definitions 
SET graph_json = '{
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "position": {"x": 100, "y": 200},
      "data": {
        "stateKey": "start",
        "label": "申請開始",
        "isInitial": true,
        "isFinal": false,
        "description": "承認フローの開始地点"
      }
    },
    {
      "id": "pending_supervisor",
      "type": "state",
      "position": {"x": 300, "y": 200},
      "data": {
        "stateKey": "pending_supervisor",
        "label": "係長承認待ち",
        "isInitial": false,
        "isFinal": false,
        "slaHours": 48,
        "description": "係長による一次承認を行います"
      }
    },
    {
      "id": "pending_manager",
      "type": "state",
      "position": {"x": 500, "y": 200},
      "data": {
        "stateKey": "pending_manager",
        "label": "部長承認待ち",
        "isInitial": false,
        "isFinal": false,
        "slaHours": 72,
        "description": "部長による最終承認を行います"
      }
    },
    {
      "id": "approved",
      "type": "end",
      "position": {"x": 700, "y": 200},
      "data": {
        "stateKey": "approved",
        "label": "承認完了",
        "isInitial": false,
        "isFinal": true,
        "description": "承認が完了しました"
      }
    },
    {
      "id": "rejected",
      "type": "end",
      "position": {"x": 500, "y": 400},
      "data": {
        "stateKey": "rejected",
        "label": "却下",
        "isInitial": false,
        "isFinal": true,
        "description": "申請が却下されました"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "start",
      "target": "pending_supervisor",
      "type": "smoothstep",
      "data": {
        "actionKey": "start_approval",
        "actionLabel": "承認開始",
        "requiresComment": false,
        "autoAdvance": true,
        "conditionExpr": null
      }
    },
    {
      "id": "e2",
      "source": "pending_supervisor",
      "target": "pending_manager",
      "type": "smoothstep",
      "data": {
        "actionKey": "approve",
        "actionLabel": "承認",
        "requiresComment": false,
        "autoAdvance": false,
        "conditionExpr": null
      }
    },
    {
      "id": "e3",
      "source": "pending_manager",
      "target": "approved",
      "type": "smoothstep",
      "data": {
        "actionKey": "approve",
        "actionLabel": "最終承認",
        "requiresComment": false,
        "autoAdvance": false,
        "conditionExpr": null
      }
    },
    {
      "id": "e4",
      "source": "pending_supervisor",
      "target": "rejected",
      "type": "smoothstep",
      "style": {"stroke": "#f87171"},
      "data": {
        "actionKey": "reject",
        "actionLabel": "却下",
        "requiresComment": true,
        "autoAdvance": false,
        "conditionExpr": null
      }
    },
    {
      "id": "e5",
      "source": "pending_manager",
      "target": "rejected",
      "type": "smoothstep",
      "style": {"stroke": "#f87171"},
      "data": {
        "actionKey": "reject",
        "actionLabel": "最終却下",
        "requiresComment": true,
        "autoAdvance": false,
        "conditionExpr": null
      }
    }
  ]
}'
WHERE id = '12345678-1234-1234-1234-123456789011';

-- 領収書簡易承認ワークフローのgraphJsonを更新
UPDATE workflow_definitions 
SET graph_json = '{
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "position": {"x": 100, "y": 200},
      "data": {
        "stateKey": "start",
        "label": "申請開始",
        "isInitial": true,
        "isFinal": false,
        "description": "承認フローの開始地点"
      }
    },
    {
      "id": "pending_approval",
      "type": "state",
      "position": {"x": 300, "y": 200},
      "data": {
        "stateKey": "pending_approval",
        "label": "承認待ち",
        "isInitial": false,
        "isFinal": false,
        "slaHours": 24,
        "description": "経理担当者による承認を行います"
      }
    },
    {
      "id": "approved",
      "type": "end",
      "position": {"x": 500, "y": 200},
      "data": {
        "stateKey": "approved",
        "label": "承認完了",
        "isInitial": false,
        "isFinal": true,
        "description": "承認が完了しました"
      }
    },
    {
      "id": "rejected",
      "type": "end",
      "position": {"x": 300, "y": 400},
      "data": {
        "stateKey": "rejected",
        "label": "却下",
        "isInitial": false,
        "isFinal": true,
        "description": "申請が却下されました"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "start",
      "target": "pending_approval",
      "type": "smoothstep",
      "data": {
        "actionKey": "start_approval",
        "actionLabel": "承認開始",
        "requiresComment": false,
        "autoAdvance": true,
        "conditionExpr": null
      }
    },
    {
      "id": "e2",
      "source": "pending_approval",
      "target": "approved",
      "type": "smoothstep",
      "data": {
        "actionKey": "approve",
        "actionLabel": "承認",
        "requiresComment": false,
        "autoAdvance": false,
        "conditionExpr": null
      }
    },
    {
      "id": "e3",
      "source": "pending_approval",
      "target": "rejected",
      "type": "smoothstep",
      "style": {"stroke": "#f87171"},
      "data": {
        "actionKey": "reject",
        "actionLabel": "却下",
        "requiresComment": true,
        "autoAdvance": false,
        "conditionExpr": null
      }
    }
  ]
}'
WHERE id = '12345678-1234-1234-1234-123456789012';

-- 新規：条件分岐付き高度な承認フロー（金額ベース）
INSERT INTO workflow_definitions (id, tenant_id, name, description, version, graph_json, is_active, created_by) VALUES
  ('12345678-1234-1234-1234-123456789013', '11111111-1111-1111-1111-111111111111', 
   '金額ベース条件分岐承認', '金額に応じて承認経路が変わる高度な承認フロー', 1,
   '{
     "nodes": [
       {
         "id": "start",
         "type": "start",
         "position": {"x": 100, "y": 250},
         "data": {
           "stateKey": "start",
           "label": "申請開始",
           "isInitial": true,
           "isFinal": false,
           "description": "承認フローの開始地点"
         }
       },
       {
         "id": "amount_check",
         "type": "state",
         "position": {"x": 300, "y": 250},
         "data": {
           "stateKey": "amount_check",
           "label": "金額確認",
           "isInitial": false,
           "isFinal": false,
           "slaHours": 2,
           "description": "申請金額を確認し、承認ルートを決定します"
         }
       },
       {
         "id": "supervisor_approval",
         "type": "state",
         "position": {"x": 500, "y": 150},
         "data": {
           "stateKey": "supervisor_approval",
           "label": "係長承認",
           "isInitial": false,
           "isFinal": false,
           "slaHours": 48,
           "description": "10万円以下の承認（係長権限）"
         }
       },
       {
         "id": "manager_approval",
         "type": "state",
         "position": {"x": 500, "y": 350},
         "data": {
           "stateKey": "manager_approval",
           "label": "部長承認",
           "isInitial": false,
           "isFinal": false,
           "slaHours": 72,
           "description": "10万円を超える承認（部長権限）"
         }
       },
       {
         "id": "director_approval",
         "type": "state",
         "position": {"x": 700, "y": 350},
         "data": {
           "stateKey": "director_approval",
           "label": "役員承認",
           "isInitial": false,
           "isFinal": false,
           "slaHours": 96,
           "description": "100万円を超える承認（役員権限）"
         }
       },
       {
         "id": "approved",
         "type": "end",
         "position": {"x": 900, "y": 250},
         "data": {
           "stateKey": "approved",
           "label": "承認完了",
           "isInitial": false,
           "isFinal": true,
           "description": "承認が完了しました"
         }
       },
       {
         "id": "rejected",
         "type": "end",
         "position": {"x": 700, "y": 500},
         "data": {
           "stateKey": "rejected",
           "label": "却下",
           "isInitial": false,
           "isFinal": true,
           "description": "申請が却下されました"
         }
       }
     ],
     "edges": [
       {
         "id": "e1",
         "source": "start",
         "target": "amount_check",
         "type": "smoothstep",
         "data": {
           "actionKey": "start",
           "actionLabel": "申請開始",
           "requiresComment": false,
           "autoAdvance": true,
           "conditionExpr": null
         }
       },
       {
         "id": "e2",
         "source": "amount_check",
         "target": "supervisor_approval",
         "type": "smoothstep",
         "label": "≤10万円",
         "data": {
           "actionKey": "route_small",
           "actionLabel": "少額承認ルート",
           "requiresComment": false,
           "autoAdvance": true,
           "conditionExpr": {"<=": [{"var": "metadata.amount"}, 100000]}
         }
       },
       {
         "id": "e3",
         "source": "amount_check",
         "target": "manager_approval",
         "type": "smoothstep",
         "label": ">10万円",
         "data": {
           "actionKey": "route_medium",
           "actionLabel": "中額承認ルート",
           "requiresComment": false,
           "autoAdvance": true,
           "conditionExpr": {
             "and": [
               {">": [{"var": "metadata.amount"}, 100000]},
               {"<=": [{"var": "metadata.amount"}, 1000000]}
             ]
           }
         }
       },
       {
         "id": "e4",
         "source": "manager_approval",
         "target": "director_approval",
         "type": "smoothstep",
         "label": ">100万円",
         "data": {
           "actionKey": "escalate",
           "actionLabel": "役員承認へエスカレーション",
           "requiresComment": false,
           "autoAdvance": true,
           "conditionExpr": {">": [{"var": "metadata.amount"}, 1000000]}
         }
       },
       {
         "id": "e5",
         "source": "supervisor_approval",
         "target": "approved",
         "type": "smoothstep",
         "data": {
           "actionKey": "approve",
           "actionLabel": "承認",
           "requiresComment": false,
           "autoAdvance": false,
           "conditionExpr": null
         }
       },
       {
         "id": "e6",
         "source": "manager_approval",
         "target": "approved",
         "type": "smoothstep",
         "data": {
           "actionKey": "approve",
           "actionLabel": "承認",
           "requiresComment": false,
           "autoAdvance": false,
           "conditionExpr": {"<=": [{"var": "metadata.amount"}, 1000000]}
         }
       },
       {
         "id": "e7",
         "source": "director_approval",
         "target": "approved",
         "type": "smoothstep",
         "data": {
           "actionKey": "approve",
           "actionLabel": "最終承認",
           "requiresComment": false,
           "autoAdvance": false,
           "conditionExpr": null
         }
       },
       {
         "id": "e8",
         "source": "supervisor_approval",
         "target": "rejected",
         "type": "smoothstep",
         "style": {"stroke": "#f87171"},
         "data": {
           "actionKey": "reject",
           "actionLabel": "却下",
           "requiresComment": true,
           "autoAdvance": false,
           "conditionExpr": null
         }
       },
       {
         "id": "e9",
         "source": "manager_approval",
         "target": "rejected",
         "type": "smoothstep",
         "style": {"stroke": "#f87171"},
         "data": {
           "actionKey": "reject",
           "actionLabel": "却下",
           "requiresComment": true,
           "autoAdvance": false,
           "conditionExpr": null
         }
       },
       {
         "id": "e10",
         "source": "director_approval",
         "target": "rejected",
         "type": "smoothstep",
         "style": {"stroke": "#f87171"},
         "data": {
           "actionKey": "reject",
           "actionLabel": "却下",
           "requiresComment": true,
           "autoAdvance": false,
           "conditionExpr": null
         }
       }
     ]
   }', true, '12345678-abcd-1234-abcd-123456789001');

-- 金額ベース条件分岐承認フローの状態定義
INSERT INTO workflow_states (id, workflow_id, state_key, label, is_initial, is_final, sla_hours, notification_template) VALUES
  ('12345678-1234-1234-1234-123456789121', '12345678-1234-1234-1234-123456789013', 'start', '申請開始', true, false, NULL, NULL),
  ('12345678-1234-1234-1234-123456789122', '12345678-1234-1234-1234-123456789013', 'amount_check', '金額確認', false, false, 2, '金額に基づいて承認ルートを決定しています'),
  ('12345678-1234-1234-1234-123456789123', '12345678-1234-1234-1234-123456789013', 'supervisor_approval', '係長承認待ち', false, false, 48, '係長承認をお待ちしています（10万円以下）'),
  ('12345678-1234-1234-1234-123456789124', '12345678-1234-1234-1234-123456789013', 'manager_approval', '部長承認待ち', false, false, 72, '部長承認をお待ちしています（10万円超）'),
  ('12345678-1234-1234-1234-123456789125', '12345678-1234-1234-1234-123456789013', 'director_approval', '役員承認待ち', false, false, 96, '役員承認をお待ちしています（100万円超）'),
  ('12345678-1234-1234-1234-123456789126', '12345678-1234-1234-1234-123456789013', 'approved', '承認完了', false, true, NULL, '承認が完了しました'),
  ('12345678-1234-1234-1234-123456789127', '12345678-1234-1234-1234-123456789013', 'rejected', '却下', false, true, NULL, '申請が却下されました');

-- 金額ベース条件分岐承認フローの遷移定義
INSERT INTO workflow_transitions (id, workflow_id, from_state_id, to_state_id, action_key, action_label, condition_expr, requires_comment, auto_advance) VALUES
  ('12345678-1234-1234-1234-123456789141', '12345678-1234-1234-1234-123456789013', '12345678-1234-1234-1234-123456789121', '12345678-1234-1234-1234-123456789122', 'start', '申請開始', NULL, false, true),
  ('12345678-1234-1234-1234-123456789142', '12345678-1234-1234-1234-123456789013', '12345678-1234-1234-1234-123456789122', '12345678-1234-1234-1234-123456789123', 'route_small', '少額承認ルート', '{"<=": [{"var": "metadata.amount"}, 100000]}', false, true),
  ('12345678-1234-1234-1234-123456789143', '12345678-1234-1234-1234-123456789013', '12345678-1234-1234-1234-123456789122', '12345678-1234-1234-1234-123456789124', 'route_medium', '中額承認ルート', '{"and": [{">": [{"var": "metadata.amount"}, 100000]}, {"<=": [{"var": "metadata.amount"}, 1000000]}]}', false, true),
  ('12345678-1234-1234-1234-123456789144', '12345678-1234-1234-1234-123456789013', '12345678-1234-1234-1234-123456789124', '12345678-1234-1234-1234-123456789125', 'escalate', '役員承認へエスカレーション', '{">": [{"var": "metadata.amount"}, 1000000]}', false, true),
  ('12345678-1234-1234-1234-123456789145', '12345678-1234-1234-1234-123456789013', '12345678-1234-1234-1234-123456789123', '12345678-1234-1234-1234-123456789126', 'approve', '承認', NULL, false, false),
  ('12345678-1234-1234-1234-123456789146', '12345678-1234-1234-1234-123456789013', '12345678-1234-1234-1234-123456789124', '12345678-1234-1234-1234-123456789126', 'approve', '承認', '{"<=": [{"var": "metadata.amount"}, 1000000]}', false, false),
  ('12345678-1234-1234-1234-123456789147', '12345678-1234-1234-1234-123456789013', '12345678-1234-1234-1234-123456789125', '12345678-1234-1234-1234-123456789126', 'approve', '最終承認', NULL, false, false),
  ('12345678-1234-1234-1234-123456789148', '12345678-1234-1234-1234-123456789013', '12345678-1234-1234-1234-123456789123', '12345678-1234-1234-1234-123456789127', 'reject', '却下', NULL, true, false),
  ('12345678-1234-1234-1234-123456789149', '12345678-1234-1234-1234-123456789013', '12345678-1234-1234-1234-123456789124', '12345678-1234-1234-1234-123456789127', 'reject', '却下', NULL, true, false),
  ('12345678-1234-1234-1234-123456789150', '12345678-1234-1234-1234-123456789013', '12345678-1234-1234-1234-123456789125', '12345678-1234-1234-1234-123456789127', 'reject', '却下', NULL, true, false);

-- 金額ベース条件分岐承認フローの状態アクション定義
INSERT INTO state_actions (id, state_id, action_key, action_label, next_state_id, requires_role, display_order, is_default) VALUES
  -- 係長承認
  ('12345678-1234-1234-1234-123456789161', '12345678-1234-1234-1234-123456789123', 'approve', '承認', '12345678-1234-1234-1234-123456789126', 'editor', 1, true),
  ('12345678-1234-1234-1234-123456789162', '12345678-1234-1234-1234-123456789123', 'reject', '却下', '12345678-1234-1234-1234-123456789127', 'editor', 2, false),
  -- 部長承認
  ('12345678-1234-1234-1234-123456789163', '12345678-1234-1234-1234-123456789124', 'approve', '承認', '12345678-1234-1234-1234-123456789126', 'admin', 1, true),
  ('12345678-1234-1234-1234-123456789164', '12345678-1234-1234-1234-123456789124', 'reject', '却下', '12345678-1234-1234-1234-123456789127', 'admin', 2, false),
  ('12345678-1234-1234-1234-123456789165', '12345678-1234-1234-1234-123456789124', 'escalate', '役員へエスカレーション', '12345678-1234-1234-1234-123456789125', 'admin', 3, false),
  -- 役員承認
  ('12345678-1234-1234-1234-123456789166', '12345678-1234-1234-1234-123456789125', 'approve', '最終承認', '12345678-1234-1234-1234-123456789126', 'admin', 1, true),
  ('12345678-1234-1234-1234-123456789167', '12345678-1234-1234-1234-123456789125', 'reject', '却下', '12345678-1234-1234-1234-123456789127', 'admin', 2, false);