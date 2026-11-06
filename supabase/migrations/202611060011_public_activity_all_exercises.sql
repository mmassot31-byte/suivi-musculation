-- Public summaries and automatic, identity-separated rankings for every exercise.
begin;
create table public.public_exercise_directory(id text primary key,label text not null,equipment text not null,tracking text not null);
create table public.public_exercise_aliases(alias text not null,kind text not null,exercise_key text not null references public.public_exercise_directory(id),primary key(alias,kind,exercise_key));
create table public.public_exercise_groups(id text primary key,exercise_key text not null references public.public_exercise_directory(id),equipment text not null,tracking text not null,unit text not null,convention text not null,lateral_mode text not null,brand text,model text,comparable boolean not null,scope_owner uuid references public.profiles(id)on delete cascade,counter text);
create table public.public_exercise_results(id text primary key,owner_id uuid not null references public.profiles(id)on delete cascade,exercise_key text not null references public.public_exercise_directory(id),group_id text not null references public.public_exercise_groups(id),session_id text not null,exercise_id text not null,set_id text not null,weight numeric,reps integer,tonnage numeric,activity_value numeric,performed_at timestamptz not null,active boolean not null default true);
create index public_results_exercise on public.public_exercise_results(exercise_key)where active;
create index public_results_owner on public.public_exercise_results(owner_id,session_id);
create index public_results_group on public.public_exercise_results(group_id,owner_id,performed_at desc)where active;
create index public_groups_exercise on public.public_exercise_groups(exercise_key);
alter table public.public_exercise_directory enable row level security;
alter table public.public_exercise_aliases enable row level security;
alter table public.public_exercise_groups enable row level security;
alter table public.public_exercise_results enable row level security;
revoke all on public.public_exercise_directory,public.public_exercise_aliases,public.public_exercise_groups,public.public_exercise_results from public,anon,authenticated;
create function public.public_exercise_name(p_name text)returns text language sql immutable set search_path=public,pg_temp as $$
 select regexp_replace(trim(translate(lower(coalesce(p_name,'')),'àáâäãåçèéêëìíîïñòóôöõøùúûüýÿ','aaaaaaceeeeiiiinoooooouuuuyy')),'\s+',' ','g');
$$;
insert into public.public_exercise_directory select id,label,equipment,tracking from jsonb_to_recordset($directory$[
  {
    "id": "library:00e4da5f80255253c72c677112e10ff8",
    "label": "Mollets debout au poids du corps",
    "equipment": "bodyweight",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:standing-calf"
    ],
    "names": [
      "Mollets debout au poids du corps"
    ],
    "alternativeKeys": [
      "standing-calf"
    ]
  },
  {
    "id": "library:0351a3f799741a62f0a693202e6bbbf1",
    "label": "Barre au front triceps",
    "equipment": "barbell",
    "tracking": "strength",
    "ids": [
      "Barre au front triceps"
    ],
    "names": [
      "Barre au front triceps"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:05ce1f475759ef83c9b5bae547159185",
    "label": "Extension de hanche",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Hip thrust"
    ],
    "names": [
      "Hip thrust",
      "Extension de hanche"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:0929f30a3b75488f0cffe675c9336f8c",
    "label": "Tirage vertical à la machine",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "lat-pull"
    ],
    "names": [
      "Lat pulldown machine",
      "Tirage vertical à la machine"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:10cb46c5199285a9e38ec3b9ef2910ca",
    "label": "PAILs / RAILs · épaule",
    "equipment": "bodyweight",
    "tracking": "mobility",
    "ids": [
      "elan-catalogue:shoulder-pails"
    ],
    "names": [
      "PAILs / RAILs · épaule",
      "PAILs",
      "RAILs",
      "pals",
      "raill",
      "Shoulder mobility"
    ],
    "alternativeKeys": [
      "shoulder-pails"
    ]
  },
  {
    "id": "library:1199ecdcddb37352ab087f954875252f",
    "label": "Good morning",
    "equipment": "barbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:good-morning"
    ],
    "names": [
      "Good morning"
    ],
    "alternativeKeys": [
      "good-morning"
    ]
  },
  {
    "id": "library:1e102cf950212837fc817fa90e862f17",
    "label": "Triceps à la corde unilatéral",
    "equipment": "cable",
    "tracking": "strength",
    "ids": [
      "Triceps à la corde unilatéral"
    ],
    "names": [
      "Triceps à la corde unilatéral"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:27a05dde8b3ddbf6e5bbed7813fe2549",
    "label": "Tirage au visage",
    "equipment": "cable",
    "tracking": "strength",
    "ids": [
      "Facepull"
    ],
    "names": [
      "Facepull",
      "Tirage au visage",
      "Face pull"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:309447bb01c6233b1b50adcffca0a7af",
    "label": "Rowing unilatéral avec haltère",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:db-row"
    ],
    "names": [
      "Rowing unilatéral avec haltère"
    ],
    "alternativeKeys": [
      "db-row"
    ]
  },
  {
    "id": "library:36d7b72ca54be83fd08d004f35d10284",
    "label": "Adducteurs",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Adducteurs"
    ],
    "names": [
      "Adducteurs"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:44366f0a60056e5c5d1e4ed9d5bec2db",
    "label": "Curl biceps",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "Curl biceps"
    ],
    "names": [
      "Curl biceps"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:4f6d973e9e51706846517bb27df9a646",
    "label": "Rotation externe de l’épaule",
    "equipment": "cable",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:shoulder-external"
    ],
    "names": [
      "Rotation externe de l’épaule",
      "Shoulder external rotation"
    ],
    "alternativeKeys": [
      "shoulder-external"
    ]
  },
  {
    "id": "library:503aa77162b1564c9aa5e58b9d976bde",
    "label": "Curl pupitre",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Curl pupitre"
    ],
    "names": [
      "Curl pupitre",
      "Preacher curl"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:52204b4e1e2718c6c88b4b9efa047133",
    "label": "Rear delt barre",
    "equipment": "barbell",
    "tracking": "strength",
    "ids": [
      "Rear delt barre"
    ],
    "names": [
      "Rear delt barre"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:593751fb42fe80e888ec4a29b2039c74",
    "label": "Soulevé de terre roumain à la barre",
    "equipment": "barbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:barbell-rdl"
    ],
    "names": [
      "Soulevé de terre roumain à la barre"
    ],
    "alternativeKeys": [
      "barbell-rdl"
    ]
  },
  {
    "id": "library:5c916330d03aa3b4fb737d5cdfc1ec43",
    "label": "Extension du dos à la machine",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Back extension machine"
    ],
    "names": [
      "Back extension machine",
      "Extension du dos à la machine"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:5cd7752cff8a1fbe18801a45fb4c75c7",
    "label": "Flexion des jambes",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:leg-curl"
    ],
    "names": [
      "Leg curl · machine à identifier",
      "Flexion des jambes"
    ],
    "alternativeKeys": [
      "leg-curl"
    ]
  },
  {
    "id": "library:61098b21186d3248967746b283995851",
    "label": "Triceps haltère",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "Triceps haltère"
    ],
    "names": [
      "Triceps haltère"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:6204abc3dc94bcf7843e80e124f1b6ba",
    "label": "Développé pectoraux",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Chest press"
    ],
    "names": [
      "Chest press",
      "Développé pectoraux"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:6389e1a52fa4f800afa7b12b8ea006c9",
    "label": "Développé décliné",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Décliné chest press"
    ],
    "names": [
      "Décliné chest press",
      "Développé décliné",
      "Decline chest press",
      "Decline bench press"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:6844aaf62e5a9285941477f50684188b",
    "label": "Abducteurs à la machine",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:abductor"
    ],
    "names": [
      "Abducteurs à la machine"
    ],
    "alternativeKeys": [
      "abductor"
    ]
  },
  {
    "id": "library:6c64d4728ec00462d9702df8c9542bce",
    "label": "Pendulum squat",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Pendulum squat"
    ],
    "names": [
      "Pendulum squat",
      "Squat pendulaire"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:6f03c364d1884fcb9bd03d1762caee15",
    "label": "Tirage menton à la barre",
    "equipment": "barbell",
    "tracking": "strength",
    "ids": [
      "Tirage menton à la barre"
    ],
    "names": [
      "Tirage menton à la barre"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:75019f5e8b9af2a0dc93788db3af52b3",
    "label": "Écarté pectoraux",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Butterfly"
    ],
    "names": [
      "Butterfly",
      "Écarté pectoraux",
      "Pec deck",
      "Chest fly"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:750ff9d617aa473c5e74582ee000c286",
    "label": "Curl marteau",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "Curl marteau"
    ],
    "names": [
      "Curl marteau",
      "Hammer curl"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:7964cf805d91173d5ae526eae3b20bfd",
    "label": "Vélo",
    "equipment": "machine",
    "tracking": "cardio",
    "ids": [
      "elan-catalogue:bike"
    ],
    "names": [
      "Vélo",
      "Bike",
      "Stationary bike"
    ],
    "alternativeKeys": [
      "bike"
    ]
  },
  {
    "id": "library:7d293c2f9907d5120706625158131cf1",
    "label": "Dips à la machine",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Seated dips"
    ],
    "names": [
      "Seated dips",
      "Dips à la machine"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:7e8026d83ed97879861118c8573640d4",
    "label": "Rameur",
    "equipment": "machine",
    "tracking": "cardio",
    "ids": [
      "elan-catalogue:rowing"
    ],
    "names": [
      "Rameur",
      "Rowing machine",
      "Ergometer"
    ],
    "alternativeKeys": [
      "rowing"
    ]
  },
  {
    "id": "library:8b441a4ac8f23e655ab783e815df6a9c",
    "label": "Fentes bulgares",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:bulgarian"
    ],
    "names": [
      "Fentes bulgares",
      "Bulgarian split squat",
      "Bulgarian squat"
    ],
    "alternativeKeys": [
      "bulgarian"
    ]
  },
  {
    "id": "library:8bcfe39672b78b1d90a73981f5dea97e",
    "label": "Arrière d’épaule aux haltères",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "Arrière d’épaule aux haltères"
    ],
    "names": [
      "Arrière d’épaule aux haltères",
      "Rear delt raise",
      "Reverse fly"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:954940111d801df9a11c4aac151270d8",
    "label": "Développé incliné",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Incliné chest press"
    ],
    "names": [
      "Incliné chest press",
      "Développé incliné",
      "Incline chest press",
      "Incline bench press"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:9a95c8692abc79690ed6219326067ed7",
    "label": "Rotation interne de l’épaule",
    "equipment": "cable",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:shoulder-internal"
    ],
    "names": [
      "Rotation interne de l’épaule",
      "Shoulder internal rotation"
    ],
    "alternativeKeys": [
      "shoulder-internal"
    ]
  },
  {
    "id": "library:9f9bd5a1703a89d0b7b58eba4f66c6f1",
    "label": "Squat à la barre",
    "equipment": "barbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:barbell-squat"
    ],
    "names": [
      "Squat à la barre"
    ],
    "alternativeKeys": [
      "barbell-squat"
    ]
  },
  {
    "id": "library:a8257b66d7ca19dc3b3af5a655f4dabe",
    "label": "Soulevé de terre roumain aux haltères",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:db-rdl"
    ],
    "names": [
      "Soulevé de terre roumain aux haltères"
    ],
    "alternativeKeys": [
      "db-rdl"
    ]
  },
  {
    "id": "library:a99d23678d51acf521adc22ef732c619",
    "label": "Élévations latérales",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "Élévations latérales aux haltères",
      "laterales-push"
    ],
    "names": [
      "Élévations latérales aux haltères",
      "Élévations latérales",
      "Lateral raise",
      "Lateral raises"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:aace1cfecbe5829f27651edf98d4418a",
    "label": "Goblet squat avec haltère",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:goblet-squat"
    ],
    "names": [
      "Goblet squat avec haltère"
    ],
    "alternativeKeys": [
      "goblet-squat"
    ]
  },
  {
    "id": "library:afc5ded2442b0af7cd7d062163bb8809",
    "label": "Extension des jambes",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:leg-extension"
    ],
    "names": [
      "Leg extension · machine à identifier",
      "Extension des jambes"
    ],
    "alternativeKeys": [
      "leg-extension"
    ]
  },
  {
    "id": "library:b10e6a8f97c36902408a141e9bf39f0f",
    "label": "Tirage horizontal",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Low row"
    ],
    "names": [
      "Low row",
      "Tirage horizontal",
      "Seated row",
      "Cable row"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:b6398eea0dce911b4455389ca76cab8f",
    "label": "Tirage vertical",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Tirage vertical",
      "lat-upper"
    ],
    "names": [
      "Tirage vertical",
      "Lat pulldown",
      "Lat pull down",
      "Pulldown"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:b6ff3baa128a60b402adbc1ed0393b4f",
    "label": "Écarté inversé à la machine",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:reverse-fly"
    ],
    "names": [
      "Écarté inversé à la machine",
      "Machine reverse fly",
      "Reverse pec deck"
    ],
    "alternativeKeys": [
      "reverse-fly"
    ]
  },
  {
    "id": "library:bf930429873502d7ddfdfb7963d569c9",
    "label": "Vélo elliptique",
    "equipment": "machine",
    "tracking": "cardio",
    "ids": [
      "elan-catalogue:elliptical"
    ],
    "names": [
      "Vélo elliptique",
      "Elliptical",
      "Cross trainer"
    ],
    "alternativeKeys": [
      "elliptical"
    ]
  },
  {
    "id": "library:c066a0c16d1f7d1dbf5f92f47298c6bb",
    "label": "Pont fessier",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Glute bridge"
    ],
    "names": [
      "Glute bridge",
      "Pont fessier"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:c83e4e672551917a7a05997e8e94747d",
    "label": "Développé épaules",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Shoulder press"
    ],
    "names": [
      "Shoulder press",
      "Développé épaules",
      "Shoulder dumbbell press",
      "Overhead press"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:c880bee09eb1e3b007fd1d4a65458ecf",
    "label": "Machine à mollets",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Machine à mollets"
    ],
    "names": [
      "Machine à mollets"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:c8b2fd6ce891289579d8e36f0f149507",
    "label": "Montées sur banc",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:step-up"
    ],
    "names": [
      "Montées sur banc"
    ],
    "alternativeKeys": [
      "step-up"
    ]
  },
  {
    "id": "library:dac33c0a01333afd995da5634b4a46c4",
    "label": "Développé couché",
    "equipment": "barbell",
    "tracking": "strength",
    "ids": [
      "Développé couché"
    ],
    "names": [
      "Développé couché",
      "Bench press",
      "Barbell bench press"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:ec6410ef408f3147417d5b3278e3f495",
    "label": "Pompes",
    "equipment": "bodyweight",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:pushup"
    ],
    "names": [
      "Pompes"
    ],
    "alternativeKeys": [
      "pushup"
    ]
  },
  {
    "id": "library:ee85ccf801ec792cc7e2898477417b99",
    "label": "Tapis de course",
    "equipment": "machine",
    "tracking": "cardio",
    "ids": [
      "elan-catalogue:treadmill"
    ],
    "names": [
      "Tapis de course",
      "Treadmill",
      "Tapis"
    ],
    "alternativeKeys": [
      "treadmill"
    ]
  },
  {
    "id": "library:fc8609027e08b8f1e4669f07f6b525c8",
    "label": "Belt squat",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:belt-squat"
    ],
    "names": [
      "Belt squat"
    ],
    "alternativeKeys": [
      "belt-squat"
    ]
  },
  {
    "id": "library:fe5ea00bf28326ffb3c52d906f40c23f",
    "label": "Presse à cuisses",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:leg-press"
    ],
    "names": [
      "Presse à cuisses",
      "Leg press"
    ],
    "alternativeKeys": [
      "leg-press"
    ]
  }
]
$directory$::jsonb)as x(id text,label text,equipment text,tracking text,ids jsonb,names jsonb,"alternativeKeys"jsonb);
insert into public.public_exercise_aliases select distinct value,kind,x.id from jsonb_to_recordset($directory$[
  {
    "id": "library:00e4da5f80255253c72c677112e10ff8",
    "label": "Mollets debout au poids du corps",
    "equipment": "bodyweight",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:standing-calf"
    ],
    "names": [
      "Mollets debout au poids du corps"
    ],
    "alternativeKeys": [
      "standing-calf"
    ]
  },
  {
    "id": "library:0351a3f799741a62f0a693202e6bbbf1",
    "label": "Barre au front triceps",
    "equipment": "barbell",
    "tracking": "strength",
    "ids": [
      "Barre au front triceps"
    ],
    "names": [
      "Barre au front triceps"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:05ce1f475759ef83c9b5bae547159185",
    "label": "Extension de hanche",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Hip thrust"
    ],
    "names": [
      "Hip thrust",
      "Extension de hanche"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:0929f30a3b75488f0cffe675c9336f8c",
    "label": "Tirage vertical à la machine",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "lat-pull"
    ],
    "names": [
      "Lat pulldown machine",
      "Tirage vertical à la machine"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:10cb46c5199285a9e38ec3b9ef2910ca",
    "label": "PAILs / RAILs · épaule",
    "equipment": "bodyweight",
    "tracking": "mobility",
    "ids": [
      "elan-catalogue:shoulder-pails"
    ],
    "names": [
      "PAILs / RAILs · épaule",
      "PAILs",
      "RAILs",
      "pals",
      "raill",
      "Shoulder mobility"
    ],
    "alternativeKeys": [
      "shoulder-pails"
    ]
  },
  {
    "id": "library:1199ecdcddb37352ab087f954875252f",
    "label": "Good morning",
    "equipment": "barbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:good-morning"
    ],
    "names": [
      "Good morning"
    ],
    "alternativeKeys": [
      "good-morning"
    ]
  },
  {
    "id": "library:1e102cf950212837fc817fa90e862f17",
    "label": "Triceps à la corde unilatéral",
    "equipment": "cable",
    "tracking": "strength",
    "ids": [
      "Triceps à la corde unilatéral"
    ],
    "names": [
      "Triceps à la corde unilatéral"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:27a05dde8b3ddbf6e5bbed7813fe2549",
    "label": "Tirage au visage",
    "equipment": "cable",
    "tracking": "strength",
    "ids": [
      "Facepull"
    ],
    "names": [
      "Facepull",
      "Tirage au visage",
      "Face pull"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:309447bb01c6233b1b50adcffca0a7af",
    "label": "Rowing unilatéral avec haltère",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:db-row"
    ],
    "names": [
      "Rowing unilatéral avec haltère"
    ],
    "alternativeKeys": [
      "db-row"
    ]
  },
  {
    "id": "library:36d7b72ca54be83fd08d004f35d10284",
    "label": "Adducteurs",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Adducteurs"
    ],
    "names": [
      "Adducteurs"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:44366f0a60056e5c5d1e4ed9d5bec2db",
    "label": "Curl biceps",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "Curl biceps"
    ],
    "names": [
      "Curl biceps"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:4f6d973e9e51706846517bb27df9a646",
    "label": "Rotation externe de l’épaule",
    "equipment": "cable",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:shoulder-external"
    ],
    "names": [
      "Rotation externe de l’épaule",
      "Shoulder external rotation"
    ],
    "alternativeKeys": [
      "shoulder-external"
    ]
  },
  {
    "id": "library:503aa77162b1564c9aa5e58b9d976bde",
    "label": "Curl pupitre",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Curl pupitre"
    ],
    "names": [
      "Curl pupitre",
      "Preacher curl"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:52204b4e1e2718c6c88b4b9efa047133",
    "label": "Rear delt barre",
    "equipment": "barbell",
    "tracking": "strength",
    "ids": [
      "Rear delt barre"
    ],
    "names": [
      "Rear delt barre"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:593751fb42fe80e888ec4a29b2039c74",
    "label": "Soulevé de terre roumain à la barre",
    "equipment": "barbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:barbell-rdl"
    ],
    "names": [
      "Soulevé de terre roumain à la barre"
    ],
    "alternativeKeys": [
      "barbell-rdl"
    ]
  },
  {
    "id": "library:5c916330d03aa3b4fb737d5cdfc1ec43",
    "label": "Extension du dos à la machine",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Back extension machine"
    ],
    "names": [
      "Back extension machine",
      "Extension du dos à la machine"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:5cd7752cff8a1fbe18801a45fb4c75c7",
    "label": "Flexion des jambes",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:leg-curl"
    ],
    "names": [
      "Leg curl · machine à identifier",
      "Flexion des jambes"
    ],
    "alternativeKeys": [
      "leg-curl"
    ]
  },
  {
    "id": "library:61098b21186d3248967746b283995851",
    "label": "Triceps haltère",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "Triceps haltère"
    ],
    "names": [
      "Triceps haltère"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:6204abc3dc94bcf7843e80e124f1b6ba",
    "label": "Développé pectoraux",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Chest press"
    ],
    "names": [
      "Chest press",
      "Développé pectoraux"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:6389e1a52fa4f800afa7b12b8ea006c9",
    "label": "Développé décliné",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Décliné chest press"
    ],
    "names": [
      "Décliné chest press",
      "Développé décliné",
      "Decline chest press",
      "Decline bench press"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:6844aaf62e5a9285941477f50684188b",
    "label": "Abducteurs à la machine",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:abductor"
    ],
    "names": [
      "Abducteurs à la machine"
    ],
    "alternativeKeys": [
      "abductor"
    ]
  },
  {
    "id": "library:6c64d4728ec00462d9702df8c9542bce",
    "label": "Pendulum squat",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Pendulum squat"
    ],
    "names": [
      "Pendulum squat",
      "Squat pendulaire"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:6f03c364d1884fcb9bd03d1762caee15",
    "label": "Tirage menton à la barre",
    "equipment": "barbell",
    "tracking": "strength",
    "ids": [
      "Tirage menton à la barre"
    ],
    "names": [
      "Tirage menton à la barre"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:75019f5e8b9af2a0dc93788db3af52b3",
    "label": "Écarté pectoraux",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Butterfly"
    ],
    "names": [
      "Butterfly",
      "Écarté pectoraux",
      "Pec deck",
      "Chest fly"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:750ff9d617aa473c5e74582ee000c286",
    "label": "Curl marteau",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "Curl marteau"
    ],
    "names": [
      "Curl marteau",
      "Hammer curl"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:7964cf805d91173d5ae526eae3b20bfd",
    "label": "Vélo",
    "equipment": "machine",
    "tracking": "cardio",
    "ids": [
      "elan-catalogue:bike"
    ],
    "names": [
      "Vélo",
      "Bike",
      "Stationary bike"
    ],
    "alternativeKeys": [
      "bike"
    ]
  },
  {
    "id": "library:7d293c2f9907d5120706625158131cf1",
    "label": "Dips à la machine",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Seated dips"
    ],
    "names": [
      "Seated dips",
      "Dips à la machine"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:7e8026d83ed97879861118c8573640d4",
    "label": "Rameur",
    "equipment": "machine",
    "tracking": "cardio",
    "ids": [
      "elan-catalogue:rowing"
    ],
    "names": [
      "Rameur",
      "Rowing machine",
      "Ergometer"
    ],
    "alternativeKeys": [
      "rowing"
    ]
  },
  {
    "id": "library:8b441a4ac8f23e655ab783e815df6a9c",
    "label": "Fentes bulgares",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:bulgarian"
    ],
    "names": [
      "Fentes bulgares",
      "Bulgarian split squat",
      "Bulgarian squat"
    ],
    "alternativeKeys": [
      "bulgarian"
    ]
  },
  {
    "id": "library:8bcfe39672b78b1d90a73981f5dea97e",
    "label": "Arrière d’épaule aux haltères",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "Arrière d’épaule aux haltères"
    ],
    "names": [
      "Arrière d’épaule aux haltères",
      "Rear delt raise",
      "Reverse fly"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:954940111d801df9a11c4aac151270d8",
    "label": "Développé incliné",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Incliné chest press"
    ],
    "names": [
      "Incliné chest press",
      "Développé incliné",
      "Incline chest press",
      "Incline bench press"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:9a95c8692abc79690ed6219326067ed7",
    "label": "Rotation interne de l’épaule",
    "equipment": "cable",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:shoulder-internal"
    ],
    "names": [
      "Rotation interne de l’épaule",
      "Shoulder internal rotation"
    ],
    "alternativeKeys": [
      "shoulder-internal"
    ]
  },
  {
    "id": "library:9f9bd5a1703a89d0b7b58eba4f66c6f1",
    "label": "Squat à la barre",
    "equipment": "barbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:barbell-squat"
    ],
    "names": [
      "Squat à la barre"
    ],
    "alternativeKeys": [
      "barbell-squat"
    ]
  },
  {
    "id": "library:a8257b66d7ca19dc3b3af5a655f4dabe",
    "label": "Soulevé de terre roumain aux haltères",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:db-rdl"
    ],
    "names": [
      "Soulevé de terre roumain aux haltères"
    ],
    "alternativeKeys": [
      "db-rdl"
    ]
  },
  {
    "id": "library:a99d23678d51acf521adc22ef732c619",
    "label": "Élévations latérales",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "Élévations latérales aux haltères",
      "laterales-push"
    ],
    "names": [
      "Élévations latérales aux haltères",
      "Élévations latérales",
      "Lateral raise",
      "Lateral raises"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:aace1cfecbe5829f27651edf98d4418a",
    "label": "Goblet squat avec haltère",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:goblet-squat"
    ],
    "names": [
      "Goblet squat avec haltère"
    ],
    "alternativeKeys": [
      "goblet-squat"
    ]
  },
  {
    "id": "library:afc5ded2442b0af7cd7d062163bb8809",
    "label": "Extension des jambes",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:leg-extension"
    ],
    "names": [
      "Leg extension · machine à identifier",
      "Extension des jambes"
    ],
    "alternativeKeys": [
      "leg-extension"
    ]
  },
  {
    "id": "library:b10e6a8f97c36902408a141e9bf39f0f",
    "label": "Tirage horizontal",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Low row"
    ],
    "names": [
      "Low row",
      "Tirage horizontal",
      "Seated row",
      "Cable row"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:b6398eea0dce911b4455389ca76cab8f",
    "label": "Tirage vertical",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Tirage vertical",
      "lat-upper"
    ],
    "names": [
      "Tirage vertical",
      "Lat pulldown",
      "Lat pull down",
      "Pulldown"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:b6ff3baa128a60b402adbc1ed0393b4f",
    "label": "Écarté inversé à la machine",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:reverse-fly"
    ],
    "names": [
      "Écarté inversé à la machine",
      "Machine reverse fly",
      "Reverse pec deck"
    ],
    "alternativeKeys": [
      "reverse-fly"
    ]
  },
  {
    "id": "library:bf930429873502d7ddfdfb7963d569c9",
    "label": "Vélo elliptique",
    "equipment": "machine",
    "tracking": "cardio",
    "ids": [
      "elan-catalogue:elliptical"
    ],
    "names": [
      "Vélo elliptique",
      "Elliptical",
      "Cross trainer"
    ],
    "alternativeKeys": [
      "elliptical"
    ]
  },
  {
    "id": "library:c066a0c16d1f7d1dbf5f92f47298c6bb",
    "label": "Pont fessier",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Glute bridge"
    ],
    "names": [
      "Glute bridge",
      "Pont fessier"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:c83e4e672551917a7a05997e8e94747d",
    "label": "Développé épaules",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Shoulder press"
    ],
    "names": [
      "Shoulder press",
      "Développé épaules",
      "Shoulder dumbbell press",
      "Overhead press"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:c880bee09eb1e3b007fd1d4a65458ecf",
    "label": "Machine à mollets",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "Machine à mollets"
    ],
    "names": [
      "Machine à mollets"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:c8b2fd6ce891289579d8e36f0f149507",
    "label": "Montées sur banc",
    "equipment": "dumbbell",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:step-up"
    ],
    "names": [
      "Montées sur banc"
    ],
    "alternativeKeys": [
      "step-up"
    ]
  },
  {
    "id": "library:dac33c0a01333afd995da5634b4a46c4",
    "label": "Développé couché",
    "equipment": "barbell",
    "tracking": "strength",
    "ids": [
      "Développé couché"
    ],
    "names": [
      "Développé couché",
      "Bench press",
      "Barbell bench press"
    ],
    "alternativeKeys": []
  },
  {
    "id": "library:ec6410ef408f3147417d5b3278e3f495",
    "label": "Pompes",
    "equipment": "bodyweight",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:pushup"
    ],
    "names": [
      "Pompes"
    ],
    "alternativeKeys": [
      "pushup"
    ]
  },
  {
    "id": "library:ee85ccf801ec792cc7e2898477417b99",
    "label": "Tapis de course",
    "equipment": "machine",
    "tracking": "cardio",
    "ids": [
      "elan-catalogue:treadmill"
    ],
    "names": [
      "Tapis de course",
      "Treadmill",
      "Tapis"
    ],
    "alternativeKeys": [
      "treadmill"
    ]
  },
  {
    "id": "library:fc8609027e08b8f1e4669f07f6b525c8",
    "label": "Belt squat",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:belt-squat"
    ],
    "names": [
      "Belt squat"
    ],
    "alternativeKeys": [
      "belt-squat"
    ]
  },
  {
    "id": "library:fe5ea00bf28326ffb3c52d906f40c23f",
    "label": "Presse à cuisses",
    "equipment": "machine",
    "tracking": "strength",
    "ids": [
      "elan-catalogue:leg-press"
    ],
    "names": [
      "Presse à cuisses",
      "Leg press"
    ],
    "alternativeKeys": [
      "leg-press"
    ]
  }
]
$directory$::jsonb)as x(id text,ids jsonb,names jsonb,"alternativeKeys"jsonb)cross join lateral(select value,'id'kind from jsonb_array_elements_text(ids)union all select public.public_exercise_name(value),'name'from jsonb_array_elements_text(names)union all select value,'alternative'from jsonb_array_elements_text("alternativeKeys"))a;


create function public.public_exercise_resolve(p_exercise jsonb,p_payload jsonb)returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare result text;v_equipment text:=coalesce(nullif(p_exercise->>'equipment',''),'unknown');v_tracking text:=coalesce(nullif(p_exercise->>'tracking',''),'strength');v_label text:=left(coalesce(nullif(p_exercise->>'name',''),p_exercise->>'id','Exercice'),200);alt text;begin
 select exercise_key into result from public_exercise_aliases where kind='id'and alias=p_exercise->>'id'limit 1;
 if result is null then alt:=p_exercise->>'alternativeKey';if alt is null then select key into alt from jsonb_each_text(case when jsonb_typeof(p_payload->'programmingPreferences'->'catalogueBindings')='object'then p_payload->'programmingPreferences'->'catalogueBindings'else '{}'::jsonb end)where value=p_exercise->>'id'limit 1;end if;
 select exercise_key into result from public_exercise_aliases where kind='alternative'and alias=alt limit 1;end if;
 if result is null then select a.exercise_key into result from public_exercise_aliases a join public_exercise_directory d on d.id=a.exercise_key where a.kind='name'and a.alias=public_exercise_name(v_label)and d.tracking=v_tracking order by(d.equipment=v_equipment)desc,d.id limit 1;end if;
 if result is null then result:='custom:'||md5(public_exercise_name(v_label)||'|'||v_equipment||'|'||v_tracking);insert into public_exercise_directory values(result,v_label,v_equipment,v_tracking)on conflict do nothing;end if;
 return result;
end$$;
create function public.public_exercise_group(p_owner uuid,p_exercise jsonb,p_payload jsonb,p_key text,p_identity jsonb,p_counter text default null)returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare d public_exercise_directory%rowtype;v public.exercise_variants%rowtype;equipment text;tracking text;unit text;conv text;mode text;known boolean;brand_text text;model_text text;scope_id uuid;result text;begin
 select * into d from public_exercise_directory where id=p_key;
 equipment:=coalesce(nullif(p_exercise->>'equipment',''),case when exists(select 1 from public_exercise_aliases where kind='id'and alias=p_exercise->>'id')then d.equipment else 'unknown'end);tracking:=d.tracking;
 unit:=coalesce(nullif(p_identity->>'unit',''),'À préciser');conv:=coalesce(nullif(p_identity->>'convention',''),'À préciser');mode:=coalesce(nullif(p_identity->>'lateralMode',''),'unknown');
 select ev.* into v from jsonb_array_elements(case when jsonb_typeof(p_payload->'publicVariantBindings')='array'then p_payload->'publicVariantBindings'else '[]'::jsonb end)b join exercise_variants ev on ev.id=b->>'variantId'where b->>'exerciseId'=p_exercise->>'id'and b->>'confirmed'='true'and b->>'convention'=conv limit 1;
 if v.id is not null then equipment:=v.equipment;brand_text:=v.brand;model_text:=v.model;end if;
 known:=unit in('kg','lb')and conv!~*'préciser|inconnu|ambigu|valeur indiquée'and mode in('total','simultaneous-pair','one-side','alternating-total','both-sides')and p_identity->>'source'in('entry','preset','confirmed');
 if equipment in('machine','cable')and(coalesce(brand_text,'')=''or coalesce(model_text,'')='')then known:=false;end if;
 if equipment='unknown'then known:=false;end if;
 if tracking in('cardio','mobility')then
  unit:=case p_counter when 'duration'then 'min'when 'distance'then 'km'when 'calories'then 'kcal'end;conv:=case p_counter when 'duration'then 'Durée enregistrée'when 'distance'then 'Distance enregistrée'when 'calories'then 'Calories enregistrées'end;mode:='activity';
  known:=p_counter='duration'or(coalesce(brand_text,'')<>''and coalesce(model_text,'')<>'');
 end if;
 known:=coalesce(known,false);scope_id:=case when not known then p_owner end;
 result:='group:'||md5(jsonb_build_array(p_key,equipment,tracking,unit,conv,mode,lower(brand_text),lower(model_text),scope_id,case when not known then p_exercise->>'id'end,p_counter)::text);
 insert into public_exercise_groups values(result,p_key,equipment,tracking,unit,conv,mode,brand_text,model_text,known,scope_id,p_counter)on conflict do nothing;
 return result;
end$$;
create function public.public_activity_project(p_owner uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare doc jsonb;s jsonb;e jsonb;a jsonb;f record;key text;grp text;title text;sid text;eid text;started timestamptz;ended timestamptz;details jsonb;pr text;count_sets integer;record_sessions jsonb;begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,111));
 select payload into doc from private_documents where owner_id=p_owner;
 update public_exercise_results set active=false where owner_id=p_owner and active;
 update friend_activity set active=false where owner_id=p_owner and active;
 select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb)into record_sessions from friend_record_sessions(p_owner)p;
 for s in select value from(select distinct on(value->>'id')value,ord from jsonb_array_elements(case when jsonb_typeof(doc->'sessions')='array'then doc->'sessions'else '[]'::jsonb end)with ordinality x(value,ord)order by value->>'id',ord desc)unique_sessions loop
  sid:=s->>'id';if sid is null or sid=doc->'active'->>'id'then continue;end if;
  begin started:=(s->>'date')::timestamptz;ended:=(s->>'endedAt')::timestamptz;exception when others then continue;end;
  if started is null or ended is null or not isfinite(started)or not isfinite(ended)or ended<started or ended>clock_timestamp()then continue;end if;
  for e in select value from jsonb_array_elements(case when jsonb_typeof(s->'exercises')='array'then s->'exercises'else '[]'::jsonb end)loop
   eid:=coalesce(e->>'instanceId',e->>'id');key:=null;
   for f in select * from social_facts where owner_id=p_owner and active and session_id=sid and exercise_id=eid and coalesce(e->>'tracking','strength')='strength'loop
    if key is null then key:=public_exercise_resolve(e,doc);end if;grp:=public_exercise_group(p_owner,e,doc,key,f.identity);
    insert into public_exercise_results(id,owner_id,exercise_key,group_id,session_id,exercise_id,set_id,weight,reps,tonnage,performed_at)values('result:'||md5(jsonb_build_array(p_owner,sid,eid,f.set_id)::text),p_owner,key,grp,sid,eid,f.set_id,f.weight,f.reps,f.tonnage,f.performed_at)
    on conflict(id)do update set exercise_key=excluded.exercise_key,group_id=excluded.group_id,weight=excluded.weight,reps=excluded.reps,tonnage=excluded.tonnage,activity_value=null,performed_at=excluded.performed_at,active=true;
   end loop;
   if e->>'tracking'in('cardio','mobility')then
    for a in select value from jsonb_array_elements(case when jsonb_typeof(e->'activityEntries')='array'then e->'activityEntries'else '[]'::jsonb end)loop
     if not friend_activity_entry_valid(a,started,ended)or(e->>'tracking'='mobility'and a->>'counter'<>'duration')then continue;end if;
     if key is null then key:=public_exercise_resolve(e,doc);end if;grp:=public_exercise_group(p_owner,e,doc,key,coalesce(e->'loadIdentity',jsonb_build_object('convention',e->>'convention')),a->>'counter');
     insert into public_exercise_results(id,owner_id,exercise_key,group_id,session_id,exercise_id,set_id,activity_value,performed_at)values('activity:'||md5(jsonb_build_array(p_owner,sid,eid,a->>'id')::text),p_owner,key,grp,sid,eid,a->>'id',(a->>'value')::numeric,(a->>'recordedAt')::timestamptz)
     on conflict(id)do update set exercise_key=excluded.exercise_key,group_id=excluded.group_id,weight=null,reps=null,tonnage=null,activity_value=excluded.activity_value,performed_at=excluded.performed_at,active=true;
    end loop;
   end if;
  end loop;
  select coalesce(jsonb_agg(x.item order by x.label),'[]'::jsonb)into details from(select d.label,jsonb_build_object('label',d.label,'equipment',g.equipment,'unit',g.unit,'convention',g.convention,'lateralMode',g.lateral_mode,'brand',g.brand,'model',g.model,'sets',count(*)filter(where r.reps is not null),'cardio',d.tracking='cardio','tracking',d.tracking,'performances',jsonb_agg(jsonb_strip_nulls(jsonb_build_object('weight',r.weight,'reps',r.reps,'tonnage',r.tonnage,'value',r.activity_value,'counter',g.counter,'unit',g.unit))order by r.performed_at,r.set_id))item from public_exercise_results r join public_exercise_directory d on d.id=r.exercise_key join public_exercise_groups g on g.id=r.group_id where r.owner_id=p_owner and r.active and r.session_id=sid group by d.id,g.id)x;
  -- Count sets independently; the detail aggregate above has one row per exercise/identity.
  select count(*)filter(where reps is not null)into count_sets from public_exercise_results where owner_id=p_owner and active and session_id=sid;
  if jsonb_array_length(details)=0 then continue;end if;
  title:=case when s->>'name'in('Push','Pull','Upper','Lower','Jambes','Full Body','Full body')then s->>'name'else 'Entraînement'end;
  select min(sf.label)into pr from jsonb_to_recordset(record_sessions)as p(session_id text,identity_key text)join social_facts sf on sf.owner_id=p_owner and sf.active and sf.session_id=p.session_id and sf.identity_key=p.identity_key where p.session_id=sid;
  insert into friend_activity(id,owner_id,session_id,kind,payload,occurred_at)values('session:'||md5(p_owner::text||':'||sid),p_owner,sid,case when pr is null then 'session'else 'record'end,jsonb_build_object('title',coalesce(pr,title),'sessionTitle',title,'minutes',greatest(0,round(extract(epoch from(ended-started))/60)),'sets',count_sets,'cardio',count_sets=0,'exercises',details),ended)
  on conflict(id)do update set kind=excluded.kind,identity_key=null,payload=excluded.payload,occurred_at=excluded.occurred_at,active=true;
 end loop;
end$$;
create or replace function public.friend_feed_after_sync()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin perform public_activity_project(new.owner_id);return new;end$$;
create or replace function public.friend_feed_share(p_enabled boolean)returns boolean language plpgsql security definer set search_path=public,pg_temp as $$begin perform social_uid();raise exception 'PUBLIC_ACTIVITY_AUTOMATIC';end$$;
create or replace function public.friend_activity_visible(p_id text)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from friend_activity a where a.id=p_id and a.active and(auth.uid()is null or not exists(select 1 from social_blocks b where(b.owner_id=auth.uid()and b.target_id=a.owner_id)or(b.owner_id=a.owner_id and b.target_id=auth.uid()))));
$$;
create or replace function public.friend_activity_data(p_id text,p_detail boolean default false)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',a.id,'kind',a.kind,'username',p.username,'avatar_path',p.avatar_path,'at',a.occurred_at,'summary',case when p_detail then a.payload else a.payload-'exercises'end,'mine',a.owner_id=auth.uid(),
 'cheers',(select count(*)from friend_activity_cheers c where c.activity_id=a.id and not exists(select 1 from social_blocks b where(b.owner_id=c.owner_id and b.target_id=a.owner_id)or(b.owner_id=a.owner_id and b.target_id=c.owner_id))),
 'cheered',exists(select 1 from friend_activity_cheers c where c.activity_id=a.id and c.owner_id=auth.uid()))from friend_activity a join profiles p on p.id=a.owner_id where a.id=p_id and friend_activity_visible(a.id);
$$;
create or replace function public.friend_feed(p_offset integer default 0)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare off integer:=greatest(0,least(coalesce(p_offset,0),2000000000));items jsonb;more boolean;begin
 select coalesce(jsonb_agg(friend_activity_data(x.id)order by x.occurred_at desc,x.id),'[]'::jsonb)into items from(select a.id,a.occurred_at from friend_activity a where a.active and friend_activity_visible(a.id)order by a.occurred_at desc,a.id limit 20 offset off)x;
 select exists(select 1 from friend_activity a where a.active and friend_activity_visible(a.id)order by a.occurred_at desc,a.id offset off+20 limit 1)into more;
 return jsonb_build_object('items',items,'hasMore',more,'automatic',true,'public',true);
end$$;
create or replace function public.friend_activity_detail(p_id text)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$declare r jsonb;begin r:=friend_activity_data(p_id,true);if r is null then raise exception 'ACTIVITY_UNAVAILABLE';end if;return r;end$$;
create or replace function public.friend_activity_react(p_id text,p_cheer boolean)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid:=social_uid();r jsonb;begin
 if p_cheer is null or not friend_activity_visible(p_id)or exists(select 1 from friend_activity where id=p_id and owner_id=u)then raise exception 'ACTIVITY_UNAVAILABLE';end if;
 if p_cheer then insert into friend_activity_cheers values(p_id,u)on conflict do nothing;else delete from friend_activity_cheers where activity_id=p_id and owner_id=u;end if;
 r:=friend_activity_data(p_id);if r is null then raise exception 'ACTIVITY_UNAVAILABLE';end if;return r;
end$$;
create function public.public_exercises(p_offset integer default 0)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(to_jsonb(x)order by label,id),'[]'::jsonb)from(select d.id,d.label,d.equipment,d.tracking from public_exercise_directory d where d.id like 'library:%'or exists(select 1 from public_exercise_results r where r.exercise_key=d.id and r.active)order by label,id limit 250 offset greatest(0,coalesce(p_offset,0)))x;
$$;
create function public.public_exercise_group_data(p_group text)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',g.id,'equipment',g.equipment,'tracking',g.tracking,'unit',g.unit,'convention',g.convention,'lateralMode',g.lateral_mode,'brand',g.brand,'model',g.model,'comparable',g.comparable,'repetitionsOnly',g.equipment='bodyweight'and not exists(select 1 from public_exercise_results r where r.group_id=g.id and r.active and r.weight>0),'tonnageAvailable',exists(select 1 from public_exercise_results r where r.group_id=g.id and r.active and r.tonnage is not null),'counter',g.counter,'owner',p.username)from public_exercise_groups g left join profiles p on p.id=g.scope_owner where g.id=p_group;
$$;
create function public.public_exercise_rankings(p_exercise text,p_group text default null,p_kind text default 'charge',p_weight numeric default null,p_reps integer default null,p_friends boolean default false,p_around boolean default true,p_offset integer default 0,p_limit integer default 25)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare chosen text:=p_group;g public_exercise_groups%rowtype;u uuid:=auth.uid();groups jsonb;entries jsonb;total integer;mine bigint;mine_offset integer;off integer:=greatest(0,least(coalesce(p_offset,0),2000000000));cap integer:=greatest(1,least(coalesce(p_limit,25),50));begin
 if p_kind not in('charge','repetitions','tonnage','duration','distance','calories')or p_weight is not null and(p_weight<0 or p_weight>1000000)or p_reps is not null and p_reps not between 1 and 10000 then raise exception 'INVALID_FILTER';end if;
 select coalesce(jsonb_agg(public_exercise_group_data(x.id)order by x.mine desc,x.known desc,x.last_at desc,x.id),'[]'::jsonb)into groups from(select gr.id,bool_or(r.owner_id=u)mine,gr.comparable known,max(r.performed_at)last_at from public_exercise_groups gr join public_exercise_results r on r.group_id=gr.id and r.active where gr.exercise_key=p_exercise group by gr.id)x;
 if chosen is null or not exists(select 1 from public_exercise_groups where id=chosen and exercise_key=p_exercise)then chosen:=groups->0->>'id';end if;
 select * into g from public_exercise_groups where id=chosen;
 if g.id is null then return jsonb_build_object('entries','[]'::jsonb,'groups',groups,'group',null,'total',0,'myRank',null,'myOffset',null,'offset',0,'limit',cap,'records','{}'::jsonb,'nearby',p_around);end if;
 if g.tracking<>'strength'and p_kind not in('duration','distance','calories')then p_kind:=g.counter;end if;
 if g.tracking='strength'and p_kind not in('charge','repetitions','tonnage')then p_kind:='charge';end if;
 if g.equipment='bodyweight'and not exists(select 1 from public_exercise_results r where r.group_id=g.id and r.active and r.weight>0)then if p_kind='charge'then p_kind:='repetitions';end if;if p_kind='repetitions'and p_weight is null then p_weight:=0;end if;end if;
 if p_kind='repetitions'and p_weight is null then return jsonb_build_object('entries','[]'::jsonb,'groups',groups,'group',public_exercise_group_data(chosen),'total',0,'myRank',null,'offset',0,'limit',cap,'kind',p_kind,'weightRequired',true,'records','{}'::jsonb);end if;
 with source as(select r.* from public_exercise_results r where r.active and r.group_id=chosen and(not p_friends or r.owner_id=u or social_friends(u,r.owner_id))and(u is null or not exists(select 1 from social_blocks b where(b.owner_id=u and b.target_id=r.owner_id)or(b.owner_id=r.owner_id and b.target_id=u)))),
 simple as(select distinct on(owner_id)owner_id,case when p_kind='repetitions'then reps::numeric when p_kind='charge'then weight else activity_value end value,reps,id,performed_at from source where p_kind in('charge','repetitions','duration','distance','calories')and(p_kind<>'repetitions'or weight=p_weight)and(p_kind<>'charge'or p_reps is null or reps=p_reps)and(p_kind in('charge','repetitions')or g.counter=p_kind)order by owner_id,(case when p_kind='repetitions'then reps::numeric when p_kind='charge'then weight else activity_value end)desc,reps desc,performed_at,id),
 volumes as(select owner_id,session_id,sum(tonnage)value,max(performed_at)performed_at,min(id)id from source where p_kind='tonnage'group by owner_id,session_id having count(*)=count(tonnage)),best_volumes as(select distinct on(owner_id)owner_id,value,null::integer reps,id,performed_at from volumes order by owner_id,value desc,performed_at,session_id),
 best as(select * from simple where value is not null union all select * from best_volumes),ranked as(select b.*,p.username,rank()over(order by value desc)rank,row_number()over(order by value desc,p.username,b.owner_id)-1 pos from best b join profiles p on p.id=b.owner_id)
 select coalesce(jsonb_agg(jsonb_build_object('rank',case when g.comparable then rank end,'value',value,'reps',reps,'ownerId',owner_id,'username',username,'performanceId',id,'performed_at',performed_at)order by pos),'[]'::jsonb),count(*),max(rank)filter(where owner_id=u),max(pos)filter(where owner_id=u)into entries,total,mine,mine_offset from ranked;
 if p_around and u is not null then cap:=4;off:=greatest(0,least(coalesce(mine_offset,0)-1,greatest(0,total-4)));end if;
 select coalesce(jsonb_agg(value order by ord),'[]'::jsonb)into entries from jsonb_array_elements(entries)with ordinality x(value,ord)where ord>off and ord<=off+cap;
 return jsonb_build_object('entries',entries,'groups',groups,'group',public_exercise_group_data(chosen),'total',total,'myRank',case when g.comparable then mine end,'myOffset',mine_offset,'offset',off,'limit',cap,'kind',p_kind,'weight',p_weight,'valueUnit',case when p_kind='tonnage'then 'kg'when p_kind='repetitions'then 'rép.'else g.unit end,'nearby',p_around,'records','{}'::jsonb,'individual',not g.comparable);
end$$;
create function public.public_exercise_candidates()returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$declare u uuid:=social_uid();begin return coalesce((select jsonb_agg(to_jsonb(x))from(select exercise_key as variant_id,group_id,max(performed_at)performed_at from public_exercise_results where owner_id=u and active group by exercise_key,group_id order by max(performed_at)desc limit 100)x),'[]'::jsonb);end$$;
create or replace function public.community_capabilities()returns jsonb language sql stable as $$select '{"version":1,"friends":true,"badges":true,"goalChallenges":true,"friendFeed":true,"personalRankings":true,"publicActivity":true,"allExercises":true}'::jsonb$$;
do $$declare f record;begin for f in select p.oid::regprocedure::text signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname in('public_exercise_name','public_exercise_resolve','public_exercise_group','public_activity_project','public_exercises','public_exercise_group_data','public_exercise_rankings','public_exercise_candidates')loop execute 'revoke all on function '||f.signature||' from public,anon,authenticated';end loop;end$$;
grant execute on function public.friend_feed(integer),public.friend_activity_detail(text),public.public_exercises(integer),public.public_exercise_rankings(text,text,text,numeric,integer,boolean,boolean,integer,integer)to anon,authenticated;
grant execute on function public.public_exercise_candidates()to authenticated;
-- Rebuild only the new/public projections. Original private JSON and old scores remain intact.
do $$declare r record;begin for r in select owner_id from private_documents loop perform public_activity_project(r.owner_id);end loop;end$$;
notify pgrst,'reload schema';
commit;
