import Image from "next/image";

import { MBTI_CATALOG } from "../../domain/mbti";
import type { MbtiType } from "../../domain/types";

export function MbtiGrid({
  onSelect,
}: {
  onSelect: (type: MbtiType) => void;
}) {
  return (
    <div className="mbti-grid" aria-label="16 种分身性格">
      {MBTI_CATALOG.map((profile) => (
        <button
          className={`mbti-card mbti-card--${profile.family}`}
          key={profile.type}
          onClick={() => onSelect(profile.type)}
          type="button"
        >
          <span className="mbti-card__portrait">
            <Image
              alt={`${profile.type} ${profile.label}头像`}
              fill
              sizes="(max-width: 480px) 44vw, 160px"
              src={`/assets/generated/avatars/${profile.type.toLowerCase()}-portrait.png`}
            />
          </span>
          <strong>{profile.type}</strong>
          <span>{profile.label}</span>
        </button>
      ))}
    </div>
  );
}
