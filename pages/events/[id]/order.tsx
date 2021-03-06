import * as React from 'react';
import * as api from '../../../api';
import Head from 'next-server/head';
import { NextPageContext, NextComponentType } from 'next';
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik';
import * as yup from 'yup';
import { Response } from 'cross-fetch';
import classNames from 'classnames';
import ym from 'react-yandex-metrika';
import phone from 'phone';

yup.addMethod(yup.object, 'uniqueProperty', function(propertyName, message) {
    return this.test('unique', message, function(value) {
        if (!value || !value[propertyName]) {
            return true;
        }

        // @ts-ignore
        if (this.parent.filter(v => v !== value).some(v => v[propertyName] === value[propertyName])) {
            throw this.createError({
                path: `${this.path}.${propertyName}`
            });
        }

        return true;
    });
});

import { Event, EventTickets } from './index';

import Container from '../../../components/Container/Container';
import './order.css';
import FormGroup from '../../../components/FormGroup';
import { FormattedDate, FormattedNumber } from 'react-intl';

type Profile = { first_name: string; last_name: string; email: string };

type EventPageProps = {
    event: Event;
    tickets: EventTickets;
    profile: Profile | null;
};

type Ticket = { type_id: string; first_name: string; last_name: string; email: string };
type Customer = {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
};

type OrderPageTemplateProps = {
    step: number;
};

const OrderPageTemplate: React.FC<OrderPageTemplateProps> = ({ step, children }) => {
    return (
        <Container className="order-container">
            <Head>
                <title>Регистрация</title>
            </Head>
            <h1 className="order-title">Регистрация</h1>
            <div className="order-steps">
                <div
                    className={classNames('order-steps__item order-step', {
                        ['order-step_status_active']: step === 0,
                        ['order-step_status_finished']: step > 0
                    })}
                >
                    <div className="order-step__number">1</div>
                    <div className="order-step__name">Данные покупателя</div>
                </div>
                <div
                    className={classNames('order-steps__item order-step', {
                        ['order-step_status_active']: step === 1,
                        ['order-step_status_finished']: step > 1
                    })}
                >
                    <div className="order-step__number">2</div>
                    <div className="order-step__name">Данные участников</div>
                </div>
                <div
                    className={classNames('order-steps__item order-step', {
                        ['order-step_status_active']: step === 2,
                        ['order-step_status_finished']: step > 2
                    })}
                >
                    <div className="order-step__number">3</div>
                    <div className="order-step__name">Оплата</div>
                </div>
            </div>
            {children}
        </Container>
    );
};

const OrderPage: NextComponentType<
    NextPageContext & {
        query: {
            id: number;
        };
    },
    EventPageProps,
    EventPageProps
> = props => {
    const [step, setStep] = React.useState(0);
    const [customer, setCustomer] = React.useState<Customer | null>(props.profile);
    const [tickets, setTickets] = React.useState<Ticket[] | null>(null);
    const [order, setOrder] = React.useState<Order | null>(null);

    if (step === 0 || customer === null) {
        return (
            <OrderPageTemplate step={0}>
                <CustomerForm
                    onSubmit={customer => {
                        setCustomer(customer);
                        setStep(1);
                    }}
                    initialValues={customer ? customer : undefined}
                />
            </OrderPageTemplate>
        );
    }

    if (step === 1 || tickets === null) {
        return (
            <OrderPageTemplate step={1}>
                <TicketsForm
                    types={props.tickets.types}
                    customer={customer}
                    onClickPrev={tickets => {
                        setTickets(tickets);
                        setStep(0);
                    }}
                    onSubmit={tickets => {
                        setTickets(tickets);
                        setStep(2);
                    }}
                    initialValues={tickets ? tickets : undefined}
                />
            </OrderPageTemplate>
        );
    }

    if (step === 2 || order === null) {
        return (
            <OrderPageTemplate step={2}>
                <PaymentForm
                    eventId={props.event.id}
                    customer={customer}
                    payments={props.tickets.payments}
                    tickets={tickets}
                    onClickPrev={() => {
                        setStep(1);
                    }}
                    onSubmit={order => {
                        setOrder(order);
                        setStep(3);
                    }}
                />
            </OrderPageTemplate>
        );
    }

    return (
        <OrderPageTemplate step={3}>
            <div className="order-step-form">
                <p className="order-step-form__information">Ваш заказ №{order.id} успешно оформлен.</p>
                {order.payment_url && (
                    <React.Fragment>
                        <p className="order-step-form__information">
                            Бронь действительна до{' '}
                            <FormattedDate
                                value={order.reserved_to}
                                month="long"
                                day="numeric"
                                hour="numeric"
                                minute="numeric"
                            />
                        </p>
                        <div className="order-step-form__buttons">
                            <a href={order.payment_url} className="button button_theme_blue">
                                Оплатить{' '}
                                <FormattedNumber
                                    style="currency"
                                    value={order.price}
                                    currency={order.currency_id}
                                    minimumFractionDigits={0}
                                />
                            </a>
                        </div>
                    </React.Fragment>
                )}
            </div>
        </OrderPageTemplate>
    );
};

type CustomerFormProps = {
    onSubmit(customer: Customer): void;
    initialValues?: Customer;
};

const CustomerForm: React.FC<CustomerFormProps> = props => {
    const schema = React.useMemo(
        () =>
            yup.object().shape({
                first_name: yup.string().required('Введите имя'),
                last_name: yup.string().required('Введите фамилию'),
                email: yup
                    .string()
                    .email('Неверный e-mail')
                    .required('Введите e-mail'),
                phone: yup
                    .string()
                    .test(
                        'is-rus-phone',
                        'Неверный номер телефона',
                        value => !value || phone(value, 'RUS').length !== 0
                    )
            }),
        []
    );

    return (
        <Formik
            initialValues={{
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                ...props.initialValues
            }}
            validationSchema={schema}
            initialStatus={null}
            onSubmit={({ phone: rawPhone, ...values }) => {
                let parsedPhone = phone(rawPhone || '', 'RUS');

                props.onSubmit({
                    ...values,
                    ...(parsedPhone.length
                        ? {
                              phone: parsedPhone[0]
                          }
                        : {})
                });
            }}
        >
            {({ isSubmitting, status }) => (
                <Form className="order-step-form">
                    <FormGroup>
                        <label htmlFor="first_name">Имя</label>
                        <Field type="text" name="first_name" id="first_name" className="form-control" />
                        <ErrorMessage name="first_name" component="div" className="invalid-feedback" />
                    </FormGroup>

                    <FormGroup>
                        <label htmlFor="last_name">Фамилия</label>
                        <Field type="text" name="last_name" id="last_name" className="form-control" />
                        <ErrorMessage name="last_name" component="div" className="invalid-feedback" />
                    </FormGroup>

                    <FormGroup>
                        <label htmlFor="email">E-mail</label>
                        <Field type="email" name="email" id="email" className="form-control" />
                        <ErrorMessage name="email" component="div" className="invalid-feedback" />
                    </FormGroup>

                    <FormGroup>
                        <label htmlFor="phone">Телефон</label>
                        <Field type="tel" name="phone" id="phone" className="form-control" />
                        <ErrorMessage name="phone" component="div" className="invalid-feedback" />
                    </FormGroup>

                    <div className="order-step-form__buttons">
                        <button type="submit" className="button" disabled={isSubmitting}>
                            {isSubmitting ? 'Проверка данных' : 'Продолжить'}
                        </button>
                    </div>
                    {status && (
                        <FormGroup>
                            <div className="invalid-feedback">{status}</div>
                        </FormGroup>
                    )}
                </Form>
            )}
        </Formik>
    );
};

type TicketsFormProps = {
    initialValues?: Ticket[];
    onSubmit(tickets: Ticket[]): void;
    onClickPrev(tickets: Ticket[]): void;
    customer: Customer;
    types: EventTickets['types'];
};

const TicketsForm: React.FC<TicketsFormProps> = props => {
    const ticketFactory = React.useCallback(
        (defaults: Partial<Ticket> = {}) => ({
            type_id: props.types.length === 1 ? props.types[0].id.toString() : '',
            first_name: defaults.first_name ? defaults.first_name : '',
            last_name: defaults.last_name ? defaults.last_name : '',
            email: defaults.email ? defaults.email : ''
        }),
        [props.types]
    );

    const schema = React.useMemo(
        () =>
            yup.object().shape({
                tickets: yup
                    .array()
                    .of(
                        yup
                            .object()
                            // @ts-ignore
                            .uniqueProperty('email', 'E-mail должен быть уникальным среди всех участников')
                            .shape({
                                type_id: yup.string().required('Выберите билет'),
                                first_name: yup.string().required('Введите имя'),
                                last_name: yup.string().required('Введите фамилию'),
                                email: yup
                                    .string()
                                    .email('Неверный e-amil')
                                    .required('Введите e-mail')
                            })
                    )
                    .min(1)
            }),
        []
    );

    return (
        <Formik
            validationSchema={schema}
            initialValues={{
                tickets: props.initialValues || [ticketFactory(props.customer)]
            }}
            onSubmit={({ tickets }) => {
                props.onSubmit(tickets);
            }}
        >
            {({ values, isSubmitting, status }) => (
                <Form className="order-step-form">
                    <FieldArray
                        name="tickets"
                        render={arrayHelpers =>
                            values.tickets.map((_, index) => (
                                <div key={index}>
                                    <p className="order-step-form__title">
                                        Участник №{index + 1}{' '}
                                        {index > 0 && (
                                            <button
                                                style={{ float: 'right' }}
                                                type="button"
                                                className="button button_size_small button_theme_link"
                                                onClick={() => arrayHelpers.remove(index)}
                                            >
                                                удалить
                                            </button>
                                        )}
                                    </p>
                                    <FormGroup>
                                        <Field
                                            component="select"
                                            name={`tickets[${index}].type_id`}
                                            id={`ticket_${index}_type_id`}
                                            className="form-control"
                                            disabled={props.types.length === 1}
                                        >
                                            <option value="">Выберите тип билета</option>
                                            {props.types
                                                .filter(type => !type.disabled)
                                                .map(type => (
                                                    <option key={type.id} value={type.id}>
                                                        {type.name}
                                                    </option>
                                                ))}
                                        </Field>
                                        <ErrorMessage
                                            name={`tickets[${index}].type_id`}
                                            component="div"
                                            className="invalid-feedback"
                                        />
                                    </FormGroup>

                                    <FormGroup>
                                        <label htmlFor={`ticket_${index}_first_name`}>Имя</label>
                                        <Field
                                            type="text"
                                            name={`tickets[${index}].first_name`}
                                            id={`ticket_${index}_first_name`}
                                            className="form-control"
                                        />
                                        <ErrorMessage
                                            name={`tickets[${index}].first_name`}
                                            component="div"
                                            className="invalid-feedback"
                                        />
                                    </FormGroup>

                                    <FormGroup>
                                        <label htmlFor={`ticket_${index}_last_name`}>Фамилия</label>
                                        <Field
                                            type="text"
                                            name={`tickets[${index}].last_name`}
                                            id={`ticket_${index}_last_name`}
                                            className="form-control"
                                        />
                                        <ErrorMessage
                                            name={`tickets[${index}].last_name`}
                                            component="div"
                                            className="invalid-feedback"
                                        />
                                    </FormGroup>

                                    <FormGroup>
                                        <label htmlFor={`ticket_${index}_email`}>E-mail</label>
                                        <Field
                                            type="email"
                                            name={`tickets[${index}].email`}
                                            id={`ticket_${index}_email`}
                                            className="form-control"
                                        />
                                        <ErrorMessage
                                            name={`tickets[${index}].email`}
                                            component="div"
                                            className="invalid-feedback"
                                        />
                                    </FormGroup>
                                    {index + 1 === values.tickets.length && (
                                        <button
                                            type="button"
                                            className="button button_size_small button_theme_link"
                                            onClick={() => arrayHelpers.insert(index + 1, ticketFactory())}
                                        >
                                            Добавить еще участника
                                        </button>
                                    )}
                                </div>
                            ))
                        }
                    />
                    <div className="order-step-form__buttons">
                        <button
                            type="button"
                            className="button"
                            onClick={() => {
                                props.onClickPrev(values.tickets);
                            }}
                        >
                            Назад
                        </button>{' '}
                        <button type="submit" className="button" disabled={isSubmitting}>
                            {isSubmitting ? 'Проверка данных' : 'Продолжить'}
                        </button>
                    </div>
                    {status && (
                        <FormGroup>
                            <div className="invalid-feedback">{status}</div>
                        </FormGroup>
                    )}
                </Form>
            )}
        </Formik>
    );
};

type Order = {
    id: string;
    payment_url: string;
    cancel_url: string;
    reserved_to: string;
    currency_id: string;
    price: number;
};

type PaymentFormProps = {
    payments: EventTickets['payments'];
    customer: Customer;
    tickets: Ticket[];
    eventId: number;
    onClickPrev(): void;
    onSubmit(order: Order): void;
};

const PaymentForm: React.FC<PaymentFormProps> = props => {
    const schema = React.useMemo(
        () =>
            yup.object().shape({
                payment_id: yup.string().required('Укажите способ оплаты')
            }),
        []
    );

    return (
        <Formik
            initialValues={{
                payment_id: props.payments.length === 1 ? props.payments[0].id.toString() : ''
            }}
            validationSchema={schema}
            initialStatus={null}
            onSubmit={async (values, actions) => {
                actions.setStatus(null);
                actions.setSubmitting(true);

                try {
                    const order = await api.eventOrder(props.eventId, {
                        ...props.customer,
                        ...values,
                        tickets: props.tickets
                    });

                    ym('reachGoal', 'event_order_success', {
                        event_id: props.eventId,
                        order_id: order.id,
                        currency: order.currency_id,
                        order_price: order.price
                    });

                    props.onSubmit(order);
                } catch (e) {
                    if (e instanceof Response) {
                        switch (e.status) {
                            case 400: {
                                const errors = await e.json();

                                Object.keys(errors).forEach(field => {
                                    if (['non_field_errors', '__all__'].includes(field)) {
                                        actions.setStatus(errors[field][0]);
                                        return;
                                    }

                                    if (['payment_id', 'legal_name', 'inn'].includes(field)) {
                                        actions.setFieldError(field, errors[field][0]);
                                    } else {
                                        throw Error(`Error for unknown field ${field}`);
                                    }
                                });

                                break;
                            }
                            default:
                                actions.setStatus('Неизвестная ошибка, попробуйте еще раз');
                                throw e;
                        }
                    } else {
                        actions.setStatus(e.toString());
                        throw e;
                    }
                } finally {
                    actions.setSubmitting(false);
                }
            }}
        >
            {({ values, isSubmitting, status }) => {
                type Payment = typeof props.payments[0];
                let payment: Payment | null = null;

                if (values.payment_id) {
                    payment = props.payments.find(payment => payment.id.toString() === values.payment_id) as Payment;
                }
                return (
                    <Form className="order-step-form">
                        <FormGroup>
                            <Field
                                component="select"
                                name="payment_id"
                                id="payment_id"
                                className="form-control"
                                disabled={props.payments.length === 1}
                            >
                                <option value="">Выберите способ оплаты</option>
                                {props.payments
                                    .filter(payment => ['invoice', 'card', 'free'].includes(payment.type))
                                    .map(payment => (
                                        <option key={payment.id} value={payment.id}>
                                            {payment.type === 'invoice' && 'По счету'}
                                            {payment.type === 'card' && 'Банковской картой'}
                                            {payment.type === 'free' && 'Бесплатно'}
                                        </option>
                                    ))}
                            </Field>
                            <ErrorMessage name="payment_id" component="div" className="invalid-feedback" />
                        </FormGroup>
                        {payment && payment.type === 'invoice' && (
                            <React.Fragment>
                                <FormGroup>
                                    <label htmlFor="legal_name">Название компании</label>
                                    <Field type="text" name="legal_name" id="legal_name" className="form-control" />
                                    <ErrorMessage name="legal_name" component="div" className="invalid-feedback" />
                                </FormGroup>

                                <FormGroup>
                                    <label htmlFor="inn">ИНН</label>
                                    <Field type="text" name="inn" id="inn" className="form-control" />
                                    <ErrorMessage name="inn" component="div" className="invalid-feedback" />
                                </FormGroup>
                            </React.Fragment>
                        )}
                        <div className="order-step-form__buttons">
                            <button type="button" className="button" onClick={props.onClickPrev}>
                                Назад
                            </button>{' '}
                            <button type="submit" className="button button_theme_blue" disabled={isSubmitting}>
                                {isSubmitting ? 'Проверка данных' : 'Купить'}
                            </button>
                        </div>
                        {status && (
                            <FormGroup>
                                <div className="invalid-feedback">{status}</div>
                            </FormGroup>
                        )}
                        {payment && (
                            <p className="order-step-form__information">
                                Нажимая на кнопку "Купить" вы подтверждаете, что изучили и согласны с{' '}
                                <a href={payment.agree_url} target="_blank">
                                    правовыми документами
                                </a>
                                .
                            </p>
                        )}
                    </Form>
                );
            }}
        </Formik>
    );
};

OrderPage.getInitialProps = async ctx => {
    let event = null;
    let tickets = null;

    try {
        [event, tickets] = await Promise.all([api.event(ctx.query.id), api.eventTickets(ctx.query.id)]);
    } finally {
        if (event === null || tickets === null || !tickets.is_active) {
            const err = new Error();
            // @ts-ignore
            err.code = 'ENOENT';
            throw err;
        }
    }

    let profile: Profile | null = null;

    try {
        profile = await api.getProfile();
    } catch (e) {
        // ignore
    }

    return {
        event,
        tickets,
        profile
    };
};

export default OrderPage;
