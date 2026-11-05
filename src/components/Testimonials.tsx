// Depoimentos de clientes — SOMENTE avaliações verdadeiras, com
// autorização expressa da cliente para publicação (texto e nome).
// Nunca inventar nomes, frases, notas ou imagens.
//
// Enquanto a lista estiver vazia, a seção inteira NÃO é renderizada
// (nenhum espaço vazio, nenhum link aponta para ela).
//
// Para publicar um depoimento autorizado, adicione um item como:
//   {
//     quote: "Texto exatamente como a cliente escreveu.",
//     clientName: "Nome como a cliente autorizou (ex.: Ana P.)",
//     service: "Produção Noiva",
//   },
type Testimonial = {
  quote: string;
  clientName: string;
  service: string;
};

const TESTIMONIALS: Testimonial[] = [];

function Testimonials() {
  if (TESTIMONIALS.length === 0) {
    return null;
  }

  return (
    <section className="testimonials" aria-labelledby="testimonials-title">
      <div className="testimonials-heading">
        <span>Experiências</span>
        <h2 id="testimonials-title">O que minhas clientes dizem</h2>
        <p>
          Cada atendimento é pensado para ser especial do início ao fim.
        </p>
      </div>

      <div className="testimonials-grid">
        {TESTIMONIALS.map((testimonial, index) => (
          <article
            key={`${testimonial.clientName}-${index}`}
            className={
              index === 1 ? "testimonial-card featured-testimonial" : "testimonial-card"
            }
          >
            <p>“{testimonial.quote}”</p>

            <h3>{testimonial.clientName}</h3>
            <span>{testimonial.service}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Testimonials;
