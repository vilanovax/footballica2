export type PushPayload =
  | {
      type: "duel_your_turn";
      title: string;
      body: string;
      url: string;
      duelId: string;
    }
  | {
      type: "vault_nearly_full";
      title: string;
      body: string;
      url: string;
    }
  | {
      type: "newspaper_ready";
      title: string;
      body: string;
      url: string;
    }
  | {
      type: "stamina_full";
      title: string;
      body: string;
      url: string;
    };
