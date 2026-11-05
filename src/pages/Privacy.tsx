import { useEffect } from "react";
import { Link } from "react-router-dom";

import SkipLink from "../components/a11y/SkipLink";
import ServiceHeader from "../components/ServiceHeader";
import { WHATSAPP_LINK } from "../config/contact";
import { PRIVACY } from "../config/privacy";

// Aviso de privacidade do formulário de agendamento e do envio pelo
// WhatsApp. Textos genéricos; os dados da profissional vêm de
// src/config/privacy.ts.

function WhatsAppContact() {
  return (
    <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
      WhatsApp {PRIVACY.whatsappLabel}
      <span className="a11y-sr-only"> (abre em nova aba)</span>
    </a>
  );
}

function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);

    const previousTitle = document.title;
    document.title = `Aviso de privacidade | ${PRIVACY.controllerName}`;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <>
      <SkipLink />

      <ServiceHeader />

      <main className="privacy-page" id="conteudo" tabIndex={-1}>
        <div className="privacy-container">
          <Link to="/" className="privacy-back">
            <span aria-hidden="true">←</span> Voltar para o início
          </Link>

          <span className="privacy-eyebrow">LGPD</span>

          <h1>Aviso de privacidade</h1>

          <p className="privacy-updated">Última atualização: {PRIVACY.lastUpdated}.</p>

          <section>
            <h2>Quem cuida dos seus dados</h2>
            <p>
              {PRIVACY.controllerName}, {PRIVACY.city}. Contato pelo <WhatsAppContact />.
            </p>
          </section>

          <section>
            <h2>Quais dados o formulário usa</h2>
            <ul>
              <li>Nome e WhatsApp (opcional).</li>
              <li>Tipo de produção e serviço escolhidos.</li>
              <li>Local do atendimento e, se for a domicílio, o endereço ou bairro.</li>
              <li>Data do evento e horário em que você precisa estar pronta.</li>
              <li>As observações que você escrever.</li>
            </ul>
          </section>

          <section>
            <h2>Para que são usados</h2>
            <p>
              Para responder à sua solicitação, verificar a disponibilidade e
              combinar o atendimento. Base legal: procedimentos preliminares a
              um contrato, feitos a seu pedido (LGPD, art. 7º, V).
            </p>
          </section>

          <section>
            <h2>Como o envio funciona</h2>
            <ul>
              <li>
                O formulário deste site apenas prepara a mensagem para o
                WhatsApp: ele não armazena as informações preenchidas em um
                banco de dados próprio nem as envia a nenhum servidor.
              </li>
              <li>
                Ao confirmar, o seu WhatsApp abre com a mensagem pronta, e ela só
                é enviada se você tocar em enviar.
              </li>
              <li>
                A partir daí, a conversa segue os termos e a política de
                privacidade do WhatsApp (Meta).
              </li>
            </ul>
          </section>

          <section>
            <h2>Conservação e exclusão dos dados</h2>
            {PRIVACY.retention ? (
              PRIVACY.retention.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
            ) : (
              <p className="privacy-pending">
                Pendente: prazo de guarda dos dados a definir pela profissional
                antes da publicação.
              </p>
            )}
          </section>

          <section>
            <h2>Compartilhamento</h2>
            <p>
              Seus dados não são vendidos nem repassados a terceiros, além do
              próprio WhatsApp usado na conversa.
            </p>
          </section>

          <section>
            <h2>Seus direitos</h2>
            <p>
              Você pode solicitar informações sobre o tratamento dos seus
              dados, além de confirmar, acessar, corrigir ou pedir a exclusão
              deles (LGPD, art. 18), pelo mesmo <WhatsAppContact />. As
              solicitações serão analisadas conforme a legislação aplicável.
            </p>
          </section>

          <section>
            <h2>Neste navegador</h2>
            <p>
              O site guarda apenas a sua preferência de exibir ou não as
              legendas de ajuda. Não usa cookies nem rastreadores.
            </p>
          </section>

          <section>
            <h2>Imagens</h2>
            <p>
              Se você aparece em alguma foto deste site e deseja que ela seja
              removida, envie a solicitação pelo <WhatsAppContact />. Ela será
              analisada e respondida.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}

export default Privacy;
